/**
 * Socket event contract — mirror of `server/src/socket/events.ts`.
 *
 * The mobile app cannot import from the server workspace (separate tsconfig,
 * separate bundler root), so the contract is duplicated here. **Keep the two in
 * sync**: if you add or rename an event on the server, mirror it here in the
 * same commit. Only the events and payload fields the app actually consumes are
 * declared — the server may emit more.
 */

export const SOCKET_EVENTS = {
  NOTICE_CREATED: 'notice:created',
  NOTICE_UPDATED: 'notice:updated',
  NOTICE_DELETED: 'notice:deleted',
  NOTICE_PUBLISHED: 'notice:published',
  NOTICE_UNPUBLISHED: 'notice:unpublished',

  EVENT_CREATED: 'event:created',
  EVENT_UPDATED: 'event:updated',
  EVENT_DELETED: 'event:deleted',
  EVENT_PUBLISHED: 'event:published',
  EVENT_UNPUBLISHED: 'event:unpublished',
  EVENT_CANCELLED: 'event:cancelled',

  REGISTRATION_CREATED: 'registration:created',
  REGISTRATION_CANCELLED: 'registration:cancelled',
  REGISTRATION_UPDATED: 'registration:updated',
  REGISTRATION_CHECKED_IN: 'registration:checkedIn',

  GALLERY_ALBUM_CREATED: 'gallery:albumCreated',
  GALLERY_ALBUM_UPDATED: 'gallery:albumUpdated',
  GALLERY_ALBUM_DELETED: 'gallery:albumDeleted',
  GALLERY_PHOTOS_ADDED: 'gallery:photosAdded',
  GALLERY_PHOTOS_DELETED: 'gallery:photosDeleted',

  MEMBER_APPROVED: 'member:approved',
  MEMBER_UPDATED: 'member:updated',
  MEMBER_STATUS_CHANGED: 'member:statusChanged',
  MEMBER_ROLE_CHANGED: 'member:roleChanged',

  NOTIFICATION_NEW: 'notification:new',
  CONNECTION_READY: 'connection:ready',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Common envelope fields present on every payload. */
export interface SocketEnvelope {
  at: string;
  actorId?: string;
}

/** Payloads are FLAT — the entity's fields sit directly on the envelope. */
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

export interface RegistrationCountPayload extends SocketEnvelope {
  eventId: string;
  registrationCount: number;
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
  category: string | null;
  isPublished: boolean;
  coverImageUrl: string | null;
  photoCount: number;
}

export interface GalleryAlbumDeletedPayload extends SocketEnvelope {
  id: string;
}

export interface GalleryPhotoPayload {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
}

export interface GalleryPhotosPayload extends SocketEnvelope {
  albumId: string;
  photoCount: number;
  photos: GalleryPhotoPayload[];
}

export interface GalleryPhotosDeletedPayload extends SocketEnvelope {
  /** Null when the photos were removed with their album. */
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

export interface NotificationPayload extends SocketEnvelope {
  /**
   * Absent on fan-out broadcasts: those insert with `createMany`, which returns a
   * count rather than rows, so there is no id to quote. Match on `data` instead.
   */
  id?: string;
  title: string;
  body: string;
  /** Carries `type` plus the entity id (`eventId` / `noticeId` / …). */
  data: Record<string, unknown>;
  unreadCount?: number;
  /**
   * True when the same change also went out as a push notification.
   *
   * A foregrounded app renders the socket copy itself, so it must suppress the
   * Expo/FCM banner for the same change or the member sees it twice.
   */
  alsoPushed: boolean;
}

export interface NoticeReadPayload extends SocketEnvelope {
  noticeId: string;
  userId: string;
  readCount: number;
}

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

export interface ConnectionReadyPayload extends SocketEnvelope {
  userId: string;
  rooms: string[];
}

export interface ServerToClientEvents {
  'notice:created': (p: NoticePayload) => void;
  'notice:updated': (p: NoticePayload) => void;
  'notice:deleted': (p: NoticeDeletedPayload) => void;
  'notice:published': (p: NoticePayload) => void;
  'notice:unpublished': (p: NoticePayload) => void;

  'event:created': (p: EventPayload) => void;
  'event:updated': (p: EventPayload) => void;
  'event:deleted': (p: EventDeletedPayload) => void;
  'event:published': (p: EventPayload) => void;
  'event:unpublished': (p: EventPayload) => void;
  'event:cancelled': (p: EventPayload) => void;

  'registration:created': (p: RegistrationPayload) => void;
  'registration:cancelled': (p: RegistrationPayload) => void;
  'registration:updated': (p: RegistrationPayload) => void;
  'registration:checkedIn': (p: RegistrationPayload) => void;

  'gallery:albumCreated': (p: GalleryAlbumPayload) => void;
  'gallery:albumUpdated': (p: GalleryAlbumPayload) => void;
  'gallery:albumDeleted': (p: GalleryAlbumDeletedPayload) => void;
  'gallery:photosAdded': (p: GalleryPhotosPayload) => void;
  'gallery:photosDeleted': (p: GalleryPhotosDeletedPayload) => void;

  'member:approved': (p: MemberPayload) => void;
  'member:updated': (p: MemberPayload) => void;
  'member:statusChanged': (p: MemberPayload) => void;
  'member:roleChanged': (p: MemberPayload) => void;

  'notification:new': (p: NotificationPayload) => void;
  'connection:ready': (p: ConnectionReadyPayload) => void;

  // Emitted to admin surfaces only; declared so the typed client stays exhaustive.
  'dashboard:updated': (p: DashboardCountersPayload) => void;
  'notice:read': (p: NoticeReadPayload) => void;
  'member:created': (p: MemberPayload) => void;
}

export interface ClientToServerEvents {
  'event:subscribe': (eventId: string) => void;
  'event:unsubscribe': (eventId: string) => void;
  ping: (nonce: string, ack: (reply: { pong: string; at: string }) => void) => void;
}
