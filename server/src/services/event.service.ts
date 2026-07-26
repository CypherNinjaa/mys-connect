import { prisma } from '../utils/prisma';
import { EventStatus, RSVPStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

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

    const rsvp = await prisma.eventRSVP.upsert({
      where: {
        userId_eventId: { userId, eventId },
      },
      update: {
        status: RSVPStatus.REGISTERED,
      },
      create: {
        userId,
        eventId,
        status: RSVPStatus.REGISTERED,
      },
    });

    return rsvp;
  }

  static async cancelRegistration(userId: string, eventId: string) {
    return prisma.eventRSVP.update({
      where: {
        userId_eventId: { userId, eventId },
      },
      data: {
        status: RSVPStatus.CANCELLED,
      },
    });
  }
}
