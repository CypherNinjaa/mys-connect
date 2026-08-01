/**
 * Payload assembly helpers.
 *
 * Some socket payloads need a count the caller does not already hold — a live
 * registration total, for instance. Rather than have every call site write the
 * same aggregate query (or, worse, have the emitters reach into Prisma and mix
 * transport with data access), the reads live here and return plain data that
 * the emitters serialise.
 *
 * These run AFTER the write has committed, so the numbers they return are the
 * post-commit truth.
 */

import { RSVPStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import type { RegistrationEmitInput } from './emitters';

interface RegistrationRowLike {
  id: string;
  eventId: string;
  userId: string;
  status: RSVPStatus | string;
  registrationCode: string | null;
  scanCount: number;
  maxScans: number;
}

/**
 * Build the live seat/attendance picture for one event.
 *
 * `registrationCount` excludes cancellations — a cancelled ticket has given its
 * seat back, so counting it would make "remaining seats" lie.
 *
 * Returns null on failure: realtime is best-effort and must never surface an
 * error into a request that has already succeeded.
 */
export async function buildRegistrationSnapshot(
  rsvp: RegistrationRowLike,
): Promise<RegistrationEmitInput | null> {
  try {
    const [event, registrationCount, checkedInCount] = await Promise.all([
      prisma.event.findUnique({
        where: { id: rsvp.eventId },
        select: { maxAttendees: true },
      }),
      prisma.eventRSVP.count({
        where: { eventId: rsvp.eventId, status: { not: RSVPStatus.CANCELLED } },
      }),
      prisma.eventRSVP.count({
        where: {
          eventId: rsvp.eventId,
          status: { not: RSVPStatus.CANCELLED },
          scanCount: { gt: 0 },
        },
      }),
    ]);

    return {
      registrationId: rsvp.id,
      eventId: rsvp.eventId,
      userId: rsvp.userId,
      status: String(rsvp.status),
      registrationCode: rsvp.registrationCode,
      scanCount: rsvp.scanCount,
      maxScans: rsvp.maxScans,
      registrationCount,
      checkedInCount,
      maxAttendees: event?.maxAttendees ?? null,
    };
  } catch (error) {
    logger.warn('Failed to build registration snapshot:', error);
    return null;
  }
}

/**
 * Current counts for the admin dashboard cards.
 *
 * Callers pass only the keys their write could have moved, so a notice edit does
 * not pay for a member recount. Each key maps to one indexed count query.
 */
export async function buildDashboardCounters(
  keys: readonly (
    | 'totalMembers'
    | 'activeMembers'
    | 'pendingApprovals'
    | 'totalEvents'
    | 'upcomingEvents'
    | 'totalNotices'
    | 'totalAlbums'
    | 'totalPhotos'
    | 'totalRegistrations'
  )[],
): Promise<Record<string, number>> {
  const wanted = new Set(keys);
  const counters: Record<string, number> = {};

  try {
    const tasks: Promise<void>[] = [];

    if (wanted.has('totalMembers')) {
      tasks.push(prisma.user.count().then((n) => void (counters.totalMembers = n)));
    }
    if (wanted.has('activeMembers')) {
      tasks.push(
        prisma.user
          .count({ where: { status: 'ACTIVE' } })
          .then((n) => void (counters.activeMembers = n)),
      );
    }
    if (wanted.has('pendingApprovals')) {
      tasks.push(
        prisma.user
          .count({ where: { status: 'PENDING' } })
          .then((n) => void (counters.pendingApprovals = n)),
      );
    }
    if (wanted.has('totalEvents')) {
      tasks.push(prisma.event.count().then((n) => void (counters.totalEvents = n)));
    }
    if (wanted.has('upcomingEvents')) {
      tasks.push(
        prisma.event
          .count({ where: { startDate: { gte: new Date() } } })
          .then((n) => void (counters.upcomingEvents = n)),
      );
    }
    if (wanted.has('totalNotices')) {
      tasks.push(prisma.notice.count().then((n) => void (counters.totalNotices = n)));
    }
    if (wanted.has('totalAlbums')) {
      tasks.push(prisma.album.count().then((n) => void (counters.totalAlbums = n)));
    }
    if (wanted.has('totalPhotos')) {
      tasks.push(prisma.albumPhoto.count().then((n) => void (counters.totalPhotos = n)));
    }
    if (wanted.has('totalRegistrations')) {
      tasks.push(prisma.eventRSVP.count().then((n) => void (counters.totalRegistrations = n)));
    }

    await Promise.all(tasks);
    return counters;
  } catch (error) {
    logger.warn('Failed to build dashboard counters:', error);
    return counters;
  }
}
