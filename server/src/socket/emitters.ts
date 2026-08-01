/**
 * Outbound socket emitters.
 *
 * This is the ONLY module that calls `io.emit`. Services import these functions
 * and call them *after* a successful Prisma commit — never before, never inside
 * a transaction callback, because a rolled-back transaction that already told
 * every client "this exists" is worse than no realtime at all.
 *
 * Every emitter is fire-and-forget and swallows its own errors: realtime is an
 * enhancement, so a socket failure must never turn a successful write into a
 * failed HTTP response.
 */

import { logger } from '../utils/logger';
import { getIO } from './io';
import { ROOM, audienceForContent } from './rooms';
import { SOCKET_EVENTS } from './events';
import type {
  DashboardCountersPayload,
  EventDeletedPayload,
  EventPayload,
  GalleryAlbumDeletedPayload,
  GalleryAlbumPayload,
  GalleryPhotosDeletedPayload,
  GalleryPhotosPayload,
  MemberPayload,
  NoticeDeletedPayload,
  NoticePayload,
  NoticeReadPayload,
  NotificationPayload,
  RegistrationPayload,
  SocketEventName,
} from './events';

/** ISO stamp used by every payload. */
const now = () => new Date().toISOString();

/**
 * Single choke point for emission. Keeps the null-guard, the room targeting and
 * the error swallowing in one place instead of repeated 20 times below.
 */
function emit(rooms: string[], event: SocketEventName, payload: unknown): void {
  const io = getIO();
  if (!io) return; // Not booted (scripts, tests) — writes still succeed.
  if (rooms.length === 0) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the event
    // map is exhaustive but TS cannot narrow a dynamic key to its payload type.
    (io.to(rooms) as any).emit(event, payload);
    logger.debug(`📡 ${event} → [${rooms.join(', ')}]`);
  } catch (error) {
    logger.warn(`Socket emit failed for ${event}:`, error);
  }
}

// ═══════════════════════════════════════════
// NOTICES
// ═══════════════════════════════════════════

type NoticeLike = {
  id: string;
  title: string;
  type: string;
  priority: string;
  isPublished: boolean;
  isPinned: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  imageUrl: string | null;
  content?: string;
};

function toNoticePayload(notice: NoticeLike, actorId?: string): NoticePayload {
  return {
    id: notice.id,
    title: notice.title,
    type: String(notice.type),
    priority: String(notice.priority),
    isPublished: notice.isPublished,
    isPinned: notice.isPinned,
    publishedAt: notice.publishedAt?.toISOString() ?? null,
    expiresAt: notice.expiresAt?.toISOString() ?? null,
    imageUrl: notice.imageUrl ?? null,
    content: notice.content,
    actorId,
    at: now(),
  };
}

/**
 * A draft notice is admin-only. Members learn about a notice when it is
 * published, not when it is typed — otherwise the app shows unfinished copy.
 */
function noticeAudience(isPublished: boolean): string[] {
  return isPublished ? [ROOM.member(), ROOM.admin()] : [ROOM.admin()];
}

export function emitNoticeCreated(notice: NoticeLike, actorId?: string): void {
  emit(noticeAudience(notice.isPublished), SOCKET_EVENTS.NOTICE_CREATED, toNoticePayload(notice, actorId));
}

export function emitNoticeUpdated(notice: NoticeLike, actorId?: string): void {
  emit(noticeAudience(notice.isPublished), SOCKET_EVENTS.NOTICE_UPDATED, toNoticePayload(notice, actorId));
}

export function emitNoticePublished(notice: NoticeLike, actorId?: string): void {
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.NOTICE_PUBLISHED, toNoticePayload(notice, actorId));
}

/** Unpublish reaches members too — their copy must disappear from the list. */
export function emitNoticeUnpublished(notice: NoticeLike, actorId?: string): void {
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.NOTICE_UNPUBLISHED, toNoticePayload(notice, actorId));
}

export function emitNoticeDeleted(id: string, actorId?: string): void {
  const payload: NoticeDeletedPayload = { id, actorId, at: now() };
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.NOTICE_DELETED, payload);
}

/** Read receipts are an admin analytic; members do not need each other's reads. */
export function emitNoticeRead(noticeId: string, userId: string, readCount: number): void {
  const payload: NoticeReadPayload = { noticeId, userId, readCount, at: now() };
  emit([ROOM.admin()], SOCKET_EVENTS.NOTICE_READ, payload);
}

// ═══════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════

type EventLike = {
  id: string;
  title: string;
  status: string;
  chapter: string | null;
  category: string | null;
  startDate: Date;
  endDate: Date | null;
  venue: string | null;
  coverImageUrl: string | null;
  maxAttendees: number | null;
  registrationOpen: boolean;
  qrScanLimit: number;
  _count?: { rsvps: number };
};

function toEventPayload(event: EventLike, actorId?: string): EventPayload {
  return {
    id: event.id,
    title: event.title,
    status: String(event.status),
    chapter: event.chapter ?? null,
    category: event.category ?? null,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    venue: event.venue ?? null,
    isPublished: String(event.status) === 'PUBLISHED',
    coverImageUrl: event.coverImageUrl ?? null,
    maxAttendees: event.maxAttendees ?? null,
    registrationOpen: event.registrationOpen,
    qrScanLimit: event.qrScanLimit,
    registrationCount: event._count?.rsvps ?? 0,
    actorId,
    at: now(),
  };
}

/** Drafts stay in the console; published events reach the event's chapter. */
function eventAudience(event: EventLike): string[] {
  if (String(event.status) === 'DRAFT') return [ROOM.admin()];
  return audienceForContent(event.chapter);
}

export function emitEventCreated(event: EventLike, actorId?: string): void {
  emit(eventAudience(event), SOCKET_EVENTS.EVENT_CREATED, toEventPayload(event, actorId));
}

export function emitEventUpdated(event: EventLike, actorId?: string): void {
  emit(eventAudience(event), SOCKET_EVENTS.EVENT_UPDATED, toEventPayload(event, actorId));
}

export function emitEventPublished(event: EventLike, actorId?: string): void {
  emit(audienceForContent(event.chapter), SOCKET_EVENTS.EVENT_PUBLISHED, toEventPayload(event, actorId));
}

export function emitEventUnpublished(event: EventLike, actorId?: string): void {
  emit(audienceForContent(event.chapter), SOCKET_EVENTS.EVENT_UNPUBLISHED, toEventPayload(event, actorId));
}

/**
 * Cancellation also reaches the event room so anyone sitting on the detail
 * screen sees it without a refetch.
 */
export function emitEventCancelled(event: EventLike, actorId?: string): void {
  emit(
    [...audienceForContent(event.chapter), ROOM.event(event.id)],
    SOCKET_EVENTS.EVENT_CANCELLED,
    toEventPayload(event, actorId),
  );
}

export function emitEventDeleted(id: string, chapter: string | null, actorId?: string): void {
  const payload: EventDeletedPayload = { id, actorId, at: now() };
  emit([...audienceForContent(chapter), ROOM.event(id)], SOCKET_EVENTS.EVENT_DELETED, payload);
}

// ═══════════════════════════════════════════
// REGISTRATIONS / TICKETS
// ═══════════════════════════════════════════

export interface RegistrationEmitInput {
  registrationId: string;
  eventId: string;
  userId: string;
  status: string;
  registrationCode: string | null;
  scanCount: number;
  maxScans: number;
  registrationCount: number;
  checkedInCount: number;
  maxAttendees: number | null;
}

function toRegistrationPayload(
  input: RegistrationEmitInput,
  actorId?: string,
): RegistrationPayload {
  return {
    registrationId: input.registrationId,
    eventId: input.eventId,
    userId: input.userId,
    status: input.status,
    registrationCode: input.registrationCode,
    scanCount: input.scanCount,
    maxScans: input.maxScans,
    registrationCount: input.registrationCount,
    remainingSeats:
      input.maxAttendees === null
        ? null
        : Math.max(0, input.maxAttendees - input.registrationCount),
    checkedInCount: input.checkedInCount,
    actorId,
    at: now(),
  };
}

/**
 * Registration traffic goes to three places: the admin console (live counters),
 * the event room (anyone watching that event), and the member themselves (their
 * ticket changed). Other members do not need it.
 */
function registrationAudience(input: RegistrationEmitInput): string[] {
  return [ROOM.admin(), ROOM.event(input.eventId), ROOM.user(input.userId)];
}

export function emitRegistrationCreated(input: RegistrationEmitInput, actorId?: string): void {
  emit(registrationAudience(input), SOCKET_EVENTS.REGISTRATION_CREATED, toRegistrationPayload(input, actorId));
}

export function emitRegistrationCancelled(input: RegistrationEmitInput, actorId?: string): void {
  emit(registrationAudience(input), SOCKET_EVENTS.REGISTRATION_CANCELLED, toRegistrationPayload(input, actorId));
}

export function emitRegistrationUpdated(input: RegistrationEmitInput, actorId?: string): void {
  emit(registrationAudience(input), SOCKET_EVENTS.REGISTRATION_UPDATED, toRegistrationPayload(input, actorId));
}

export function emitRegistrationCheckedIn(input: RegistrationEmitInput, actorId?: string): void {
  emit(registrationAudience(input), SOCKET_EVENTS.REGISTRATION_CHECKED_IN, toRegistrationPayload(input, actorId));
}

// ═══════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════

type AlbumLike = {
  id: string;
  title: string;
  category: string;
  isPublished: boolean;
  coverImageUrl: string | null;
  _count?: { photos: number };
};

function toAlbumPayload(album: AlbumLike, actorId?: string): GalleryAlbumPayload {
  return {
    id: album.id,
    title: album.title,
    category: String(album.category),
    isPublished: album.isPublished,
    coverImageUrl: album.coverImageUrl ?? null,
    photoCount: album._count?.photos ?? 0,
    actorId,
    at: now(),
  };
}

function albumAudience(isPublished: boolean): string[] {
  return isPublished ? [ROOM.member(), ROOM.admin()] : [ROOM.admin()];
}

export function emitGalleryAlbumCreated(album: AlbumLike, actorId?: string): void {
  emit(albumAudience(album.isPublished), SOCKET_EVENTS.GALLERY_ALBUM_CREATED, toAlbumPayload(album, actorId));
}

export function emitGalleryAlbumUpdated(album: AlbumLike, actorId?: string): void {
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.GALLERY_ALBUM_UPDATED, toAlbumPayload(album, actorId));
}

export function emitGalleryAlbumDeleted(id: string, actorId?: string): void {
  const payload: GalleryAlbumDeletedPayload = { id, actorId, at: now() };
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.GALLERY_ALBUM_DELETED, payload);
}

/**
 * Called once Cloudinary has returned and the rows are committed, so the URLs in
 * the payload are already fetchable by the client.
 */
export function emitGalleryPhotosAdded(
  albumId: string,
  photos: GalleryPhotosPayload['photos'],
  photoCount: number,
  isPublished: boolean,
  actorId?: string,
): void {
  const payload: GalleryPhotosPayload = { albumId, photos, photoCount, actorId, at: now() };
  emit(albumAudience(isPublished), SOCKET_EVENTS.GALLERY_PHOTOS_ADDED, payload);
}

export function emitGalleryPhotosDeleted(
  albumId: string | null,
  photoIds: string[],
  photoCount?: number,
  actorId?: string,
): void {
  const payload: GalleryPhotosDeletedPayload = { albumId, photoIds, photoCount, actorId, at: now() };
  emit([ROOM.member(), ROOM.admin()], SOCKET_EVENTS.GALLERY_PHOTOS_DELETED, payload);
}

/** Convenience alias matching the brief's `emitGalleryUpdated()`. */
export const emitGalleryUpdated = emitGalleryAlbumUpdated;

// ═══════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════

type MemberLike = {
  id: string;
  fullName: string | null;
  email: string;
  memberId: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  // Structurally loose on purpose: callers pass whole Prisma `user` rows whose
  // profile carries a dozen columns we do not read. Only `city` is required, and
  // only when the caller happened to include it.
  profile?: ({ city?: { name: string } | null } & Record<string, unknown>) | null;
};

function toMemberPayload(user: MemberLike, actorId?: string): MemberPayload {
  return {
    id: user.id,
    fullName: user.fullName ?? null,
    email: user.email,
    memberId: user.memberId ?? null,
    role: String(user.role),
    status: String(user.status),
    avatarUrl: user.avatarUrl ?? null,
    city: user.profile?.city?.name ?? null,
    actorId,
    at: now(),
  };
}

/**
 * Member records are admin data plus the member's own devices. We never fan a
 * member's email and status out to the whole `role:member` room.
 */
function memberAudience(userId: string): string[] {
  return [ROOM.admin(), ROOM.user(userId)];
}

export function emitMemberCreated(user: MemberLike, actorId?: string): void {
  emit(memberAudience(user.id), SOCKET_EVENTS.MEMBER_CREATED, toMemberPayload(user, actorId));
}

export function emitMemberApproved(user: MemberLike, actorId?: string): void {
  emit(memberAudience(user.id), SOCKET_EVENTS.MEMBER_APPROVED, toMemberPayload(user, actorId));
}

export function emitMemberUpdated(user: MemberLike, actorId?: string): void {
  emit(memberAudience(user.id), SOCKET_EVENTS.MEMBER_UPDATED, toMemberPayload(user, actorId));
}

export function emitMemberStatusChanged(user: MemberLike, actorId?: string): void {
  emit(memberAudience(user.id), SOCKET_EVENTS.MEMBER_STATUS_CHANGED, toMemberPayload(user, actorId));
}

export function emitMemberRoleChanged(user: MemberLike, actorId?: string): void {
  emit(memberAudience(user.id), SOCKET_EVENTS.MEMBER_ROLE_CHANGED, toMemberPayload(user, actorId));
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════

/**
 * Nudge the admin dashboard cards.
 *
 * Deliberately a *delta hint*, not a full stats recomputation: recounting nine
 * aggregates on every write would put the dashboard's cost on the write path.
 * The client applies the deltas it is given and leaves the rest untouched.
 */
export function emitDashboardUpdated(
  counters: Omit<DashboardCountersPayload, 'at' | 'actorId'>,
  actorId?: string,
): void {
  const payload: DashboardCountersPayload = { ...counters, actorId, at: now() };
  emit([ROOM.admin()], SOCKET_EVENTS.DASHBOARD_UPDATED, payload);
}

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════

/**
 * In-app mirror of a push notification, delivered only to the target user's
 * devices. `alsoPushed` lets a foregrounded client suppress the FCM banner for
 * the same change and render the socket copy instead — one alert, not two.
 */
export function emitNotificationToUser(
  userId: string,
  notification: Omit<NotificationPayload, 'at' | 'actorId'>,
  actorId?: string,
): void {
  const payload: NotificationPayload = { ...notification, actorId, at: now() };
  emit([ROOM.user(userId)], SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

export function emitNotificationToUsers(
  userIds: string[],
  notification: Omit<NotificationPayload, 'at' | 'actorId'>,
  actorId?: string,
): void {
  if (userIds.length === 0) return;
  const payload: NotificationPayload = { ...notification, actorId, at: now() };
  emit(userIds.map(ROOM.user), SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}
