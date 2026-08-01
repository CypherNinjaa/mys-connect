import { prisma } from '../utils/prisma';
import { EventStatus, RSVPStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { buildQrPayload, generateRegistrationCode } from '../utils/ticket';
import { emitRegistrationCancelled, emitRegistrationCreated } from '../socket/emitters';
import { buildRegistrationSnapshot } from '../socket/snapshots';
import QRCode from 'qrcode';

/** Prisma's error code for a violated unique index. */
const UNIQUE_VIOLATION = 'P2002';

/** Attempts before giving up on finding a free registration code. */
const CODE_MINT_ATTEMPTS = 5;

/**
 * Broadcast a registration change once it has committed.
 *
 * Registering has three commit paths (re-register, upsert, and the retry loop),
 * so the emit lives here rather than being repeated at each one.
 *
 * Deliberately not awaited: the snapshot runs three count queries to work out
 * live seat totals, and a member's "register" tap must not wait on them. A
 * failure inside is swallowed by the emitter layer — realtime is best-effort and
 * can never turn a successful registration into an error response.
 */
function publishRegistration(
  rsvp: { id: string; eventId: string; userId: string; status: RSVPStatus; registrationCode: string | null; scanCount: number; maxScans: number },
  actorId: string,
  kind: 'created' | 'cancelled' = 'created',
): void {
  void buildRegistrationSnapshot(rsvp).then((snapshot) => {
    if (!snapshot) return;
    if (kind === 'cancelled') {
      emitRegistrationCancelled(snapshot, actorId);
    } else {
      emitRegistrationCreated(snapshot, actorId);
    }
  });
}

/**
 * Renders a ticket's QR as a PNG data URI.
 *
 * Generated server-side and sent as a data URI so the mobile app can draw it
 * with a plain `<Image>`: the app is a bare/prebuild Expo project, and pulling
 * in a native SVG renderer just for this would force a full Android rebuild.
 */
function renderQrDataUrl(eventId: string, code: string): Promise<string> {
  return QRCode.toDataURL(buildQrPayload(eventId, code), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#1A202C', light: '#FFFFFF' },
  });
}


export class EventService {
  static async getEvents(query: {
    status?: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'PAST' | 'PUBLISHED';
    search?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const now = new Date();
    const where: any = {
      isPublic: true,
      status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED] },
    };

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { venue: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (query.status === 'UPCOMING') {
      where.startDate = { gte: now };
      where.status = EventStatus.PUBLISHED;
    } else if (query.status === 'ONGOING') {
      where.startDate = { lte: now };
      where.endDate = { gte: now };
      where.status = EventStatus.PUBLISHED;
    } else if (query.status === 'COMPLETED' || query.status === 'PAST') {
      where.OR = [
        { endDate: { lt: now } },
        { status: EventStatus.COMPLETED },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: query.status === 'COMPLETED' || query.status === 'PAST' ? 'desc' : 'asc' },
        include: {
          city: true,
          _count: {
            select: { rsvps: true },
          },
        },
      }),
    ]);

    // Check user registration status
    let userRsvps = new Set<string>();
    if (query.userId && events.length > 0) {
      const rsvps = await prisma.eventRSVP.findMany({
        where: {
          userId: query.userId,
          eventId: { in: events.map((e) => e.id) },
          status: RSVPStatus.REGISTERED,
        },
        select: { eventId: true },
      });
      userRsvps = new Set(rsvps.map((r) => r.eventId));
    }

    const formattedEvents = events.map((evt) => ({
      ...evt,
      isRegistered: userRsvps.has(evt.id),
    }));

    return {
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  static async getEventById(id: string, userId?: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        city: true,
        photos: true,
        _count: { select: { rsvps: true } },
      },
    });

    if (!event) throw new AppError('Event not found', 404);

    let isRegistered = false;
    if (userId) {
      const rsvp = await prisma.eventRSVP.findUnique({
        where: {
          userId_eventId: { userId, eventId: id },
        },
      });
      isRegistered = rsvp?.status === RSVPStatus.REGISTERED;
    }

    return {
      ...event,
      isRegistered,
    };
  }

  static async registerForEvent(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError('Event not found', 404);

    if (event.status === EventStatus.CANCELLED) {
      throw new AppError('This event has been cancelled', 400);
    }

    if (event.maxAttendees) {
      const count = await prisma.eventRSVP.count({
        where: { eventId, status: RSVPStatus.REGISTERED },
      });
      if (count >= event.maxAttendees) {
        throw new AppError('Event capacity has been reached', 400);
      }
    }

    // Re-registering after a cancellation must not mint a second code: the
    // member may already have the old ticket saved or screenshotted, and
    // rotating it would silently invalidate what is in their hands.
    const existing = await prisma.eventRSVP.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { registrationCode: true },
    });

    if (existing?.registrationCode) {
      const rsvp = await prisma.eventRSVP.update({
        where: { userId_eventId: { userId, eventId } },
        data: { status: RSVPStatus.REGISTERED },
      });
      publishRegistration(rsvp, userId);
      return rsvp;
    }

    // `maxScans` is snapshotted from the event's current QR life rather than
    // read live at scan time, so an admin raising the event limit later cannot
    // retroactively change the quota on a ticket already issued.
    for (let attempt = 0; attempt < CODE_MINT_ATTEMPTS; attempt += 1) {
      const registrationCode = generateRegistrationCode();
      try {
        const rsvp = await prisma.eventRSVP.upsert({
          where: { userId_eventId: { userId, eventId } },
          update: {
            status: RSVPStatus.REGISTERED,
            registrationCode,
            maxScans: event.qrScanLimit,
          },
          create: {
            userId,
            eventId,
            status: RSVPStatus.REGISTERED,
            registrationCode,
            maxScans: event.qrScanLimit,
          },
        });
        publishRegistration(rsvp, userId);
        return rsvp;
      } catch (error) {
        const isCodeCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_VIOLATION &&
          String(error.meta?.target ?? '').includes('registrationCode');

        if (!isCodeCollision) throw error;
        // Drew an already-issued code — vanishingly unlikely, but the unique
        // index is the real guarantee, so just draw again.
      }
    }

    throw new AppError('Could not issue a ticket code. Please try again.', 500);
  }

  static async cancelRegistration(userId: string, eventId: string) {
    const rsvp = await prisma.eventRSVP.update({
      where: {
        userId_eventId: { userId, eventId },
      },
      data: {
        status: RSVPStatus.CANCELLED,
      },
    });

    publishRegistration(rsvp, userId, 'cancelled');
    return rsvp;
  }

  /**
   * Every ticket the member currently holds, newest event first.
   *
   * Cancelled RSVPs are excluded — a cancelled ticket is not a ticket — but
   * `ATTENDED` ones are kept so a member can still show proof of entry after
   * being scanned in. Each row carries its QR image, so the tickets tab needs
   * exactly one request.
   */
  static async getMyRegistrations(userId: string) {
    const rsvps = await prisma.eventRSVP.findMany({
      where: {
        userId,
        status: { in: [RSVPStatus.REGISTERED, RSVPStatus.ATTENDED] },
      },
      orderBy: { event: { startDate: 'desc' } },
      take: 100,
      include: {
        event: {
          include: { city: true },
        },
      },
    });

    const registrations = await Promise.all(
      rsvps.map(async (rsvp) => {
        // Pre-existing rows from before ticketing have no code yet; they are
        // backfilled by script, but the tab must not crash on one meanwhile.
        const qrDataUrl = rsvp.registrationCode
          ? await renderQrDataUrl(rsvp.eventId, rsvp.registrationCode)
          : null;

        return {
          id: rsvp.id,
          eventId: rsvp.eventId,
          status: rsvp.status,
          registrationCode: rsvp.registrationCode,
          qrDataUrl,
          scanCount: rsvp.scanCount,
          maxScans: rsvp.maxScans,
          scansRemaining: Math.max(0, rsvp.maxScans - rsvp.scanCount),
          firstScanAt: rsvp.firstScanAt,
          lastScanAt: rsvp.lastScanAt,
          registeredAt: rsvp.createdAt,
          event: {
            id: rsvp.event.id,
            title: rsvp.event.title,
            shortDesc: rsvp.event.shortDesc,
            startDate: rsvp.event.startDate,
            endDate: rsvp.event.endDate,
            startTime: rsvp.event.startTime,
            endTime: rsvp.event.endTime,
            venue: rsvp.event.venue,
            address: rsvp.event.address,
            isOnline: rsvp.event.isOnline,
            meetingLink: rsvp.event.meetingLink,
            coverImageUrl: rsvp.event.coverImageUrl,
            status: rsvp.event.status,
            city: rsvp.event.city ? { id: rsvp.event.city.id, name: rsvp.event.city.name } : null,
          },
        };
      })
    );

    return { registrations };
  }
}
