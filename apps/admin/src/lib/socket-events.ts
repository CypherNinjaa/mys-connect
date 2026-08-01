/**
 * MIRROR of `server/src/socket/events.ts` — keep the two in sync.
 *
 * The admin app is a separate workspace, so a cross-workspace import of the
 * server's contract does not resolve. This file re-declares the parts of that
 * contract the admin console actually listens to. When the server file changes,
 * change this one in the same commit or the listeners will silently go stale.
 *
 * Only the server → client direction is fully mirrored; the client → server map
 * is trimmed to the events this app can send.
 */

// ─── Domains ──────────────────────────────
export const SOCKET_EVENTS = {
  // Notices
  NOTICE_CREATED: 'notice:created',
  NOTICE_UPDATED: 'notice:updated',
  NOTICE_DELETED: 'notice:deleted',
  NOTICE_PUBLISHED: 'notice:published',
  NOTICE_UNPUBLISHED: 'notice:unpublished',
  NOTICE_READ: 'notice:read',

  // Events
  EVENT_CREATED: 'event:created',
  EVENT_UPDATED: 'event:updated',
  EVENT_DELETED: 'event:deleted',
  EVENT_PUBLISHED: 'event:published',
  EVENT_UNPUBLISHED: 'event:unpublished',
  EVENT_CANCELLED: 'event:cancelled',

  // Event registrations / tickets
  REGISTRATION_CREATED: 'registration:created',
  REGISTRATION_CANCELLED: 'registration:cancelled',
  REGISTRATION_UPDATED: 'registration:updated',
  REGISTRATION_CHECKED_IN: 'registration:checkedIn',

  // Gallery
  GALLERY_ALBUM_CREATED: 'gallery:albumCreated',
  GALLERY_ALBUM_UPDATED: 'gallery:albumUpdated',
  GALLERY_ALBUM_DELETED: 'gallery:albumDeleted',
  GALLERY_PHOTOS_ADDED: 'gallery:photosAdded',
  GALLERY_PHOTOS_DELETED: 'gallery:photosDeleted',

  // Members
  MEMBER_CREATED: 'member:created',
  MEMBER_APPROVED: 'member:approved',
  MEMBER_UPDATED: 'member:updated',
  MEMBER_STATUS_CHANGED: 'member:statusChanged',
  MEMBER_ROLE_CHANGED: 'member:roleChanged',

  // Dashboard counters
  DASHBOARD_UPDATED: 'dashboard:updated',

  // Per-user notification mirror of an FCM push
  NOTIFICATION_NEW: 'notification:new',

  // Connection lifecycle (server → client)
  CONNECTION_READY: 'connection:ready',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Payload shapes ───────────────────────

/** Every payload carries this so clients can ignore their own echo and order events. */
export interface SocketEnvelope {
  /** Emission timestamp, ISO 8601. */
  at: string;
  /** DB id of the admin who caused the change, when there is one. */
  actorId?: string;
}

export interface NoticePayload extends SocketEnvelope {
  id: string;
  title: string;
  type: string;
  priority: string;
  isPublished: boolean;
  isPinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  imageUrl: string | null;
  content?: string;
}

export interface NoticeDeletedPayload extends SocketEnvelope {
  id: string;
}

export interface NoticeReadPayload extends SocketEnvelope {
  noticeId: string;
  userId: string;
  readCount: number;
}

export interface EventPayload extends SocketEnvelope {
  id: string;
  title: string;
  status: string;
  chapter: string | null;
  category: string | null;
  startDate: string;
  endDate: string | null;
  venue: string | null;
  isPublished: boolean;
  coverImageUrl: string | null;
  maxAttendees: number | null;
  registrationOpen: boolean;
  qrScanLimit: number;
  registrationCount: number;
}

export interface EventDeletedPayload extends SocketEnvelope {
  id: string;
}

/** Live seat maths, kept separate so a single RSVP does not push a whole event object. */
export interface RegistrationCountPayload extends SocketEnvelope {
  eventId: string;
  registrationCount: number;
  /** null when the event has no cap. */
  remainingSeats: number | null;
  checkedInCount: number;
}

export interface RegistrationPayload extends RegistrationCountPayload {
  registrationId: string;
  userId: string;
  status: string;
  registrationCode: string | null;
  scanCount: number;
  maxScans: number;
}

export interface GalleryAlbumPayload extends SocketEnvelope {
  id: string;
  title: string;
  category: string;
  isPublished: boolean;
  coverImageUrl: string | null;
  photoCount: number;
}

export interface GalleryAlbumDeletedPayload extends SocketEnvelope {
  id: string;
}

export interface GalleryPhotosPayload extends SocketEnvelope {
  albumId: string;
  photoCount: number;
  photos: {
    id: string;
    imageUrl: string;
    thumbnailUrl: string | null;
    caption: string | null;
    sortOrder: number;
  }[];
}

export interface GalleryPhotosDeletedPayload extends SocketEnvelope {
  albumId: string | null;
  photoIds: string[];
  photoCount?: number;
}

export interface MemberPayload extends SocketEnvelope {
  id: string;
  fullName: string | null;
  email: string;
  memberId: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
  city: string | null;
}

/** Counters for the admin dashboard cards. Partial: only what changed is sent. */
export interface DashboardCountersPayload extends SocketEnvelope {
  totalMembers?: number;
  activeMembers?: number;
  pendingApprovals?: number;
  totalEvents?: number;
  upcomingEvents?: number;
  totalNotices?: number;
  totalAlbums?: number;
  totalPhotos?: number;
  totalRegistrations?: number;
}

export interface NotificationPayload extends SocketEnvelope {
  /** Absent on fan-out broadcasts, which insert with `createMany` and get no rows back. */
  id?: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Server's authoritative unread total, when the caller computed one. */
  unreadCount?: number;
  /** Set when the same change also went out over FCM. */
  alsoPushed: boolean;
}

export interface ConnectionReadyPayload {
  socketId: string;
  userId: string;
  role: string;
  rooms: string[];
  at: string;
}

/** Server → client event map. Types every listener this app registers. */
export interface ServerToClientEvents {
  [SOCKET_EVENTS.NOTICE_CREATED]: (p: NoticePayload) => void;
  [SOCKET_EVENTS.NOTICE_UPDATED]: (p: NoticePayload) => void;
  [SOCKET_EVENTS.NOTICE_DELETED]: (p: NoticeDeletedPayload) => void;
  [SOCKET_EVENTS.NOTICE_PUBLISHED]: (p: NoticePayload) => void;
  [SOCKET_EVENTS.NOTICE_UNPUBLISHED]: (p: NoticePayload) => void;
  [SOCKET_EVENTS.NOTICE_READ]: (p: NoticeReadPayload) => void;

  [SOCKET_EVENTS.EVENT_CREATED]: (p: EventPayload) => void;
  [SOCKET_EVENTS.EVENT_UPDATED]: (p: EventPayload) => void;
  [SOCKET_EVENTS.EVENT_DELETED]: (p: EventDeletedPayload) => void;
  [SOCKET_EVENTS.EVENT_PUBLISHED]: (p: EventPayload) => void;
  [SOCKET_EVENTS.EVENT_UNPUBLISHED]: (p: EventPayload) => void;
  [SOCKET_EVENTS.EVENT_CANCELLED]: (p: EventPayload) => void;

  [SOCKET_EVENTS.REGISTRATION_CREATED]: (p: RegistrationPayload) => void;
  [SOCKET_EVENTS.REGISTRATION_CANCELLED]: (p: RegistrationPayload) => void;
  [SOCKET_EVENTS.REGISTRATION_UPDATED]: (p: RegistrationPayload) => void;
  [SOCKET_EVENTS.REGISTRATION_CHECKED_IN]: (p: RegistrationPayload) => void;

  [SOCKET_EVENTS.GALLERY_ALBUM_CREATED]: (p: GalleryAlbumPayload) => void;
  [SOCKET_EVENTS.GALLERY_ALBUM_UPDATED]: (p: GalleryAlbumPayload) => void;
  [SOCKET_EVENTS.GALLERY_ALBUM_DELETED]: (p: GalleryAlbumDeletedPayload) => void;
  [SOCKET_EVENTS.GALLERY_PHOTOS_ADDED]: (p: GalleryPhotosPayload) => void;
  [SOCKET_EVENTS.GALLERY_PHOTOS_DELETED]: (p: GalleryPhotosDeletedPayload) => void;

  [SOCKET_EVENTS.MEMBER_CREATED]: (p: MemberPayload) => void;
  [SOCKET_EVENTS.MEMBER_APPROVED]: (p: MemberPayload) => void;
  [SOCKET_EVENTS.MEMBER_UPDATED]: (p: MemberPayload) => void;
  [SOCKET_EVENTS.MEMBER_STATUS_CHANGED]: (p: MemberPayload) => void;
  [SOCKET_EVENTS.MEMBER_ROLE_CHANGED]: (p: MemberPayload) => void;

  [SOCKET_EVENTS.DASHBOARD_UPDATED]: (p: DashboardCountersPayload) => void;
  [SOCKET_EVENTS.NOTIFICATION_NEW]: (p: NotificationPayload) => void;
  [SOCKET_EVENTS.CONNECTION_READY]: (p: ConnectionReadyPayload) => void;
}

/** Client → server events. Deliberately tiny: clients subscribe, they never mutate. */
export interface ClientToServerEvents {
  /** Opt into live updates for one event's registration counters. */
  'event:subscribe': (eventId: string) => void;
  'event:unsubscribe': (eventId: string) => void;
  /** Liveness probe; server replies with the same nonce. */
  ping: (nonce: string, ack?: (reply: { pong: string; at: string }) => void) => void;
}
