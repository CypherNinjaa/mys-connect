/**
 * Maps socket events onto cache patches.
 *
 * This is the only place that knows both the wire contract and the cache shape.
 * `socket.service.ts` owns the connection and knows nothing about caches; the
 * cache managers own their data and know nothing about sockets.
 *
 * The rule throughout: **patch, never refetch.** Every handler below mutates the
 * cache from the payload it was given and publishes a change so open screens
 * re-render. None of them triggers an API call. That keeps the existing
 * cache-first, manual-refresh-only behaviour intact while still showing changes
 * the instant they happen.
 *
 * Handlers no-op on a cold cache — nothing is on screen to patch, and the next
 * screen mount will fetch current state anyway.
 */

import { EventCacheManager } from './eventCacheManager';
import { GalleryCacheManager } from './galleryCacheManager';
import { HomeCacheManager } from './homeCacheManager';
import { publishCacheChange } from './cacheEvents';
import { markDeliveredViaSocket, type AppClientSocket } from './socket.service';
import { SOCKET_EVENTS } from './socket-events';
import type {
  EventDeletedPayload,
  EventPayload,
  GalleryAlbumDeletedPayload,
  GalleryAlbumPayload,
  GalleryPhotosDeletedPayload,
  GalleryPhotosPayload,
  MemberPayload,
  NoticeDeletedPayload,
  NoticePayload,
  NotificationPayload,
  RegistrationPayload,
} from './socket-events';

/** Callbacks the member layout supplies so the socket can drive tab-level UI. */
export interface RealtimeCallbacks {
  /** Set the notifications tab badge from the server's authoritative count. */
  onUnreadCount?: (count: number) => void;
  /** A new notification arrived while the app was open. */
  onNotification?: (payload: NotificationPayload) => void;
  /** This member's own account status changed — the auth gate may need to re-run. */
  onOwnStatusChange?: (status: string) => void;
}

/**
 * Attach every listener and return a single teardown function.
 *
 * Registration and cleanup are deliberately symmetrical: one array, one loop
 * each way. That is what keeps a re-run of the calling effect from leaving a
 * duplicate listener behind — the leak the user explicitly asked to avoid.
 */
export function attachRealtimeSync(
  socket: AppClientSocket,
  callbacks: RealtimeCallbacks = {},
): () => void {
  // ── Notices ────────────────────────────────────────────────────────────────
  // There is no notice cache today, so notices publish on their channel and the
  // screen re-reads. Once a notice cache exists this is where it gets patched.
  const onNoticeCreated = (_payload: NoticePayload) => publishCacheChange('notices');
  const onNoticeUpdated = (_payload: NoticePayload) => publishCacheChange('notices');
  const onNoticePublished = (_payload: NoticePayload) => publishCacheChange('notices');
  const onNoticeUnpublished = (_payload: NoticePayload) => publishCacheChange('notices');
  const onNoticeDeleted = (_payload: NoticeDeletedPayload) => publishCacheChange('notices');

  // ── Events ─────────────────────────────────────────────────────────────────
  const onEventCreated = (payload: EventPayload) => {
    EventCacheManager.insertEvent(payload);
    publishCacheChange('home');
  };

  const onEventUpdated = (payload: EventPayload) => {
    // Replace only this event, in both the events list and the home slices.
    EventCacheManager.patchEvent(payload);
    HomeCacheManager.patchEvent(payload);
    publishCacheChange('event-detail');
  };

  const onEventPublished = (payload: EventPayload) => {
    EventCacheManager.insertEvent(payload);
    publishCacheChange('home');
  };

  const onEventUnpublished = (payload: EventPayload) => {
    // An unpublished event must disappear from the member's copy.
    EventCacheManager.removeEvent(payload.id);
    HomeCacheManager.removeEvent(payload.id);
  };

  const onEventCancelled = (payload: EventPayload) => {
    // Cancelled events stay visible, flagged — a member holding a ticket needs to
    // see that it was called off, not have it silently vanish.
    EventCacheManager.patchEvent(payload);
    HomeCacheManager.patchEvent(payload);
    publishCacheChange('event-detail');
  };

  const onEventDeleted = (payload: EventDeletedPayload) => {
    EventCacheManager.removeEvent(payload.id);
    HomeCacheManager.removeEvent(payload.id);
  };

  // ── Registrations / live seat counts ───────────────────────────────────────
  const applyCounters = (payload: RegistrationPayload) => {
    EventCacheManager.patchCounters(payload.eventId, {
      registrationCount: payload.registrationCount,
      remainingSeats: payload.remainingSeats,
    });
    HomeCacheManager.patchEvent({
      id: payload.eventId,
      registrationCount: payload.registrationCount,
      remainingSeats: payload.remainingSeats,
    });
    publishCacheChange('event-detail');
  };

  const onRegistrationCreated = (payload: RegistrationPayload) => applyCounters(payload);
  const onRegistrationCancelled = (payload: RegistrationPayload) => applyCounters(payload);
  const onRegistrationUpdated = (payload: RegistrationPayload) => applyCounters(payload);
  const onRegistrationCheckedIn = (payload: RegistrationPayload) => {
    applyCounters(payload);
    // The member's own ticket changed scan state — the QR screen shows it.
    publishCacheChange('events');
  };

  // ── Gallery ────────────────────────────────────────────────────────────────
  const onPhotosAdded = (payload: GalleryPhotosPayload) => {
    // The payload carries the real photo rows, so new images appear with no refetch.
    GalleryCacheManager.insertPhotos(payload.albumId, payload.photos);
  };

  const onPhotosDeleted = (payload: GalleryPhotosDeletedPayload) => {
    GalleryCacheManager.removePhotos(payload.albumId, payload.photoIds);
  };

  const onAlbumCreated = (payload: GalleryAlbumPayload) => {
    GalleryCacheManager.insertAlbum(payload);
  };

  const onAlbumUpdated = (payload: GalleryAlbumPayload) => {
    GalleryCacheManager.patchAlbum(payload);
  };

  const onAlbumDeleted = (payload: GalleryAlbumDeletedPayload) => {
    GalleryCacheManager.removeAlbum(payload.id);
  };

  // ── Members ────────────────────────────────────────────────────────────────
  // These only ever arrive for this member's own account (the server sends member
  // PII to `user:{id}` and admins, never to the member broadcast room).
  const onMemberApproved = (payload: MemberPayload) => {
    HomeCacheManager.patchUser(payload);
    publishCacheChange('profile');
    callbacks.onOwnStatusChange?.(payload.status);
  };

  const onMemberUpdated = (payload: MemberPayload) => {
    HomeCacheManager.patchUser(payload);
    publishCacheChange('profile');
    publishCacheChange('directory');
  };

  const onMemberStatusChanged = (payload: MemberPayload) => {
    HomeCacheManager.patchUser(payload);
    publishCacheChange('profile');
    callbacks.onOwnStatusChange?.(payload.status);
  };

  const onMemberRoleChanged = (payload: MemberPayload) => {
    HomeCacheManager.patchUser(payload);
    publishCacheChange('profile');
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const onNotification = (payload: NotificationPayload) => {
    if (payload.alsoPushed) {
      // Record it so the Expo foreground handler suppresses the duplicate banner
      // for the same change.
      markDeliveredViaSocket(payload.data);
    }

    // Prefer the server's count over a local increment: an optimistic +1 drifts
    // as soon as the member reads something on another device.
    if (typeof payload.unreadCount === 'number') {
      callbacks.onUnreadCount?.(payload.unreadCount);
    }

    callbacks.onNotification?.(payload);
    publishCacheChange('notifications');
  };

  const bindings: [string, (...args: never[]) => void][] = [
    [SOCKET_EVENTS.NOTICE_CREATED, onNoticeCreated as (...args: never[]) => void],
    [SOCKET_EVENTS.NOTICE_UPDATED, onNoticeUpdated as (...args: never[]) => void],
    [SOCKET_EVENTS.NOTICE_PUBLISHED, onNoticePublished as (...args: never[]) => void],
    [SOCKET_EVENTS.NOTICE_UNPUBLISHED, onNoticeUnpublished as (...args: never[]) => void],
    [SOCKET_EVENTS.NOTICE_DELETED, onNoticeDeleted as (...args: never[]) => void],

    [SOCKET_EVENTS.EVENT_CREATED, onEventCreated as (...args: never[]) => void],
    [SOCKET_EVENTS.EVENT_UPDATED, onEventUpdated as (...args: never[]) => void],
    [SOCKET_EVENTS.EVENT_PUBLISHED, onEventPublished as (...args: never[]) => void],
    [SOCKET_EVENTS.EVENT_UNPUBLISHED, onEventUnpublished as (...args: never[]) => void],
    [SOCKET_EVENTS.EVENT_CANCELLED, onEventCancelled as (...args: never[]) => void],
    [SOCKET_EVENTS.EVENT_DELETED, onEventDeleted as (...args: never[]) => void],

    [SOCKET_EVENTS.REGISTRATION_CREATED, onRegistrationCreated as (...args: never[]) => void],
    [SOCKET_EVENTS.REGISTRATION_CANCELLED, onRegistrationCancelled as (...args: never[]) => void],
    [SOCKET_EVENTS.REGISTRATION_UPDATED, onRegistrationUpdated as (...args: never[]) => void],
    [SOCKET_EVENTS.REGISTRATION_CHECKED_IN, onRegistrationCheckedIn as (...args: never[]) => void],

    [SOCKET_EVENTS.GALLERY_PHOTOS_ADDED, onPhotosAdded as (...args: never[]) => void],
    [SOCKET_EVENTS.GALLERY_PHOTOS_DELETED, onPhotosDeleted as (...args: never[]) => void],
    [SOCKET_EVENTS.GALLERY_ALBUM_CREATED, onAlbumCreated as (...args: never[]) => void],
    [SOCKET_EVENTS.GALLERY_ALBUM_UPDATED, onAlbumUpdated as (...args: never[]) => void],
    [SOCKET_EVENTS.GALLERY_ALBUM_DELETED, onAlbumDeleted as (...args: never[]) => void],

    [SOCKET_EVENTS.MEMBER_APPROVED, onMemberApproved as (...args: never[]) => void],
    [SOCKET_EVENTS.MEMBER_UPDATED, onMemberUpdated as (...args: never[]) => void],
    [SOCKET_EVENTS.MEMBER_STATUS_CHANGED, onMemberStatusChanged as (...args: never[]) => void],
    [SOCKET_EVENTS.MEMBER_ROLE_CHANGED, onMemberRoleChanged as (...args: never[]) => void],

    [SOCKET_EVENTS.NOTIFICATION_NEW, onNotification as (...args: never[]) => void],
  ];

  bindings.forEach(([event, handler]) => {
    socket.on(event as never, handler as never);
  });

  return () => {
    bindings.forEach(([event, handler]) => {
      socket.off(event as never, handler as never);
    });
  };
}
