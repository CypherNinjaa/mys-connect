/**
 * Socket → React Query cache synchronisation.
 *
 * Every server event maps to exactly one handler here. The bias is surgical:
 * patch the cached row the payload already describes rather than invalidating and
 * paying for a refetch. Invalidation is the fallback, used only where a patch
 * cannot be correct — creates and deletes (which move rows between pages and
 * change pagination totals) and reorders.
 *
 * ─── The one rule to remember ───
 * The query functions in this app do NOT unwrap consistently. Some return
 * `res.data` (bare), others return the whole `{ success, data }` envelope. Each
 * updater below is written against the shape of *its own* queryFn, noted in a
 * comment. Check the queryFn before changing any of them, and always guard for
 * `undefined` — an updater runs even when the query has never been fetched.
 */

import type { QueryClient } from '@tanstack/react-query';
import type {
  AlbumData,
  AlbumListResponse,
  ApiResponse,
  DashboardData,
  EventData,
  EventRegistrationsResponse,
  NoticeData,
  PaginationMeta,
  PhotoData,
  UserData,
} from './api';
import type {
  DashboardCountersPayload,
  EventPayload,
  GalleryAlbumPayload,
  GalleryPhotosPayload,
  MemberPayload,
  NoticePayload,
  RegistrationPayload,
  ServerToClientEvents,
} from './socket-events';
import { SOCKET_EVENTS } from './socket-events';

// ─── Cached shapes, named after the queryFn that produces them ───────────────

/** `['dashboard']` — dashboard/page.tsx returns `res.data`, so this is bare. */
type DashboardCache = DashboardData;

/** `['members', …]` — members/page.tsx returns the envelope. */
type MembersCache = ApiResponse<{ users: UserData[]; pagination: PaginationMeta }>;

/** `['member-detail', id]` — members/[id]/page.tsx returns `res.data`, bare. */
type MemberDetailCache = UserData;

/** `['events', …]` — events/page.tsx returns the envelope. */
type EventsCache = ApiResponse<{ events: EventData[]; pagination: PaginationMeta }>;

/** `['event-registrations', id]` — envelope. */
type RegistrationsCache = ApiResponse<EventRegistrationsResponse>;

/** `['notices', …]` — envelope. */
type NoticesCache = ApiResponse<{ notices: NoticeData[]; pagination: PaginationMeta }>;

/** `['albums', …]` — envelope. */
type AlbumsCache = ApiResponse<AlbumListResponse>;

/** `['album', id]` — envelope. */
type AlbumCache = ApiResponse<AlbumData>;

/** The socket contract uses `null` for "absent"; the REST types use `undefined`. */
function orUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export function createCacheHandlers(queryClient: QueryClient): ServerToClientEvents {
  // ─── Small helpers ─────────────────────────────────────────────────────────

  const invalidate = (...roots: string[]): void => {
    for (const root of roots) {
      void queryClient.invalidateQueries({ queryKey: [root] });
    }
  };

  /** Replace one event row wherever it is cached, across every filter/page variant. */
  const patchEventRow = (id: string, patch: (event: EventData) => EventData): void => {
    queryClient.setQueriesData<EventsCache>({ queryKey: ['events'] }, (cached) => {
      if (!cached?.data?.events) return cached;
      let hit = false;
      const events = cached.data.events.map((event) => {
        if (event.id !== id) return event;
        hit = true;
        return patch(event);
      });
      // Returning the original reference when nothing matched keeps React Query
      // from notifying observers of a no-op change.
      if (!hit) return cached;
      return { ...cached, data: { ...cached.data, events } };
    });

    queryClient.setQueriesData<RegistrationsCache>(
      { queryKey: ['event-registrations'] },
      (cached) => {
        const event = cached?.data?.event;
        if (!event || event.id !== id) return cached;
        return { ...cached, data: { ...cached.data, event: patch(event) } };
      },
    );
  };

  /** Map the wire shape of an event onto the REST shape the tables render. */
  const applyEventPayload = (event: EventData, p: EventPayload): EventData => ({
    ...event,
    title: p.title,
    status: p.status,
    chapter: orUndefined(p.chapter),
    category: orUndefined(p.category),
    startDate: p.startDate,
    endDate: orUndefined(p.endDate),
    venue: orUndefined(p.venue),
    isPublished: p.isPublished,
    coverImageUrl: orUndefined(p.coverImageUrl),
    maxAttendees: orUndefined(p.maxAttendees),
    registrationOpen: p.registrationOpen,
    qrScanLimit: p.qrScanLimit,
    // The events table reads seats as `_count.rsvps` against maxAttendees.
    _count: { ...event._count, rsvps: p.registrationCount },
  });

  const onEventChanged = (p: EventPayload): void => {
    patchEventRow(p.id, (event) => applyEventPayload(event, p));
  };

  /** Replace one notice row wherever it is cached. */
  const patchNoticeRow = (p: NoticePayload): void => {
    queryClient.setQueriesData<NoticesCache>({ queryKey: ['notices'] }, (cached) => {
      if (!cached?.data?.notices) return cached;
      let hit = false;
      const notices = cached.data.notices.map((notice) => {
        if (notice.id !== p.id) return notice;
        hit = true;
        return {
          ...notice,
          title: p.title,
          type: p.type,
          priority: p.priority,
          isPublished: p.isPublished,
          isPinned: p.isPinned,
          publishedAt: orUndefined(p.publishedAt),
          expiresAt: orUndefined(p.expiresAt),
          imageUrl: orUndefined(p.imageUrl),
          // `content` is omitted from list payloads; keep whatever we already hold.
          ...(p.content === undefined ? {} : { content: p.content }),
        };
      });
      if (!hit) return cached;
      return { ...cached, data: { ...cached.data, notices } };
    });
  };

  /** Apply a member payload to a cached user row. */
  const applyMemberPayload = (user: UserData, p: MemberPayload): UserData => ({
    ...user,
    fullName: orUndefined(p.fullName),
    email: p.email,
    memberId: orUndefined(p.memberId),
    role: p.role,
    status: p.status,
    avatarUrl: orUndefined(p.avatarUrl),
    // The payload carries a city *name* but the cache holds a city row keyed by
    // id. Rename in place when we already have the row; never invent an id.
    profile:
      user.profile?.city && p.city
        ? { ...user.profile, city: { ...user.profile.city, name: p.city } }
        : user.profile,
  });

  const patchMemberRow = (p: MemberPayload): void => {
    queryClient.setQueriesData<MembersCache>({ queryKey: ['members'] }, (cached) => {
      if (!cached?.data?.users) return cached;
      let hit = false;
      const users = cached.data.users.map((user) => {
        if (user.id !== p.id) return user;
        hit = true;
        return applyMemberPayload(user, p);
      });
      if (!hit) return cached;
      return { ...cached, data: { ...cached.data, users } };
    });

    queryClient.setQueriesData<MemberDetailCache>({ queryKey: ['member-detail'] }, (cached) => {
      if (!cached || cached.id !== p.id) return cached;
      return applyMemberPayload(cached, p);
    });

    // The dashboard embeds member rows in two lists. The counter cards are fixed
    // by `dashboard:updated`, but these lists would otherwise keep showing a
    // member in the pending queue after another admin approved them.
    queryClient.setQueryData<DashboardCache>(['dashboard'], (cached) => {
      if (!cached) return cached;
      const recentMembers = cached.recentMembers?.map((user) =>
        user.id === p.id ? applyMemberPayload(user, p) : user,
      );
      const pending = cached.pendingUsersList;
      const pendingUsersList =
        p.status === 'PENDING'
          ? pending?.map((user) => (user.id === p.id ? applyMemberPayload(user, p) : user))
          : pending?.filter((user) => user.id !== p.id);
      return { ...cached, recentMembers: recentMembers ?? cached.recentMembers, pendingUsersList };
    });
  };

  /**
   * Registration traffic only ever moves counters plus (at most) one ticket row.
   * `remainingSeats` is not stored — the UI derives it from maxAttendees minus
   * `_count.rsvps`, so writing the count is what makes the seat maths right.
   */
  const patchRegistrationCounts = (p: RegistrationPayload): void => {
    patchEventRow(p.eventId, (event) => ({
      ...event,
      _count: { ...event._count, rsvps: p.registrationCount },
    }));

    queryClient.setQueryData<RegistrationsCache>(
      ['event-registrations', p.eventId],
      (cached) => {
        if (!cached?.data) return cached;
        return {
          ...cached,
          data: {
            ...cached.data,
            // `checkedInCount` is authoritative from the server; the rest of the
            // stats block is left alone rather than guessed at.
            stats: { ...cached.data.stats, checkedIn: p.checkedInCount },
          },
        };
      },
    );
  };

  /** Patch the ticket row itself, for events that change an existing ticket. */
  const patchRegistrationRow = (p: RegistrationPayload): void => {
    queryClient.setQueryData<RegistrationsCache>(
      ['event-registrations', p.eventId],
      (cached) => {
        if (!cached?.data?.registrations) return cached;
        let hit = false;
        const registrations = cached.data.registrations.map((row) => {
          if (row.id !== p.registrationId) return row;
          hit = true;
          return {
            ...row,
            status: p.status as typeof row.status,
            registrationCode: p.registrationCode,
            scanCount: p.scanCount,
            maxScans: p.maxScans,
          };
        });
        if (!hit) return cached;
        return { ...cached, data: { ...cached.data, registrations } };
      },
    );
  };

  /**
   * Album counters live in two places: the list row and the list-wide stats.
   * `photoCount` is the server's absolute total and wins when sent; when it is
   * absent the row falls back to its own count shifted by `delta`.
   */
  const patchAlbumPhotoCount = (
    albumId: string,
    photoCount: number | undefined,
    delta: number,
  ): void => {
    queryClient.setQueriesData<AlbumsCache>({ queryKey: ['albums'] }, (cached) => {
      if (!cached?.data?.albums) return cached;
      let hit = false;
      const albums = cached.data.albums.map((album) => {
        if (album.id !== albumId) return album;
        hit = true;
        const photos = photoCount ?? Math.max(0, (album._count?.photos ?? 0) + delta);
        return { ...album, _count: { ...album._count, photos } };
      });
      if (!hit) return cached;
      return {
        ...cached,
        data: {
          ...cached.data,
          albums,
          stats: {
            ...cached.data.stats,
            totalPhotos: Math.max(0, cached.data.stats.totalPhotos + delta),
          },
        },
      };
    });
  };

  // ─── Handlers, one per server event ────────────────────────────────────────

  return {
    // ── Notices ──
    // A create shifts every row after it, so pagination has to be refetched.
    [SOCKET_EVENTS.NOTICE_CREATED]: () => {
      invalidate('notices', 'notice-kpis');
    },
    [SOCKET_EVENTS.NOTICE_UPDATED]: (p) => {
      patchNoticeRow(p);
    },
    // Publishing moves a notice between the published/draft KPI buckets, which
    // the payload does not carry — the row patch is surgical, the KPIs are not.
    [SOCKET_EVENTS.NOTICE_PUBLISHED]: (p) => {
      patchNoticeRow(p);
      invalidate('notice-kpis');
    },
    [SOCKET_EVENTS.NOTICE_UNPUBLISHED]: (p) => {
      patchNoticeRow(p);
      invalidate('notice-kpis');
    },
    [SOCKET_EVENTS.NOTICE_DELETED]: () => {
      invalidate('notices', 'notice-kpis');
    },
    // Read receipts are a member-app concern; no admin query caches readCount.
    [SOCKET_EVENTS.NOTICE_READ]: () => {
      /* no admin cache holds this */
    },

    // ── Events ──
    [SOCKET_EVENTS.EVENT_CREATED]: () => {
      invalidate('events', 'events-kpis');
    },
    [SOCKET_EVENTS.EVENT_UPDATED]: onEventChanged,
    // Status transitions re-bucket the KPI tiles (upcoming/draft/cancelled/…).
    [SOCKET_EVENTS.EVENT_PUBLISHED]: (p) => {
      onEventChanged(p);
      invalidate('events-kpis');
    },
    [SOCKET_EVENTS.EVENT_UNPUBLISHED]: (p) => {
      onEventChanged(p);
      invalidate('events-kpis');
    },
    [SOCKET_EVENTS.EVENT_CANCELLED]: (p) => {
      onEventChanged(p);
      invalidate('events-kpis');
    },
    [SOCKET_EVENTS.EVENT_DELETED]: () => {
      invalidate('events', 'events-kpis');
    },

    // ── Registrations ──
    // A new ticket brings a member row the payload does not include (name, email,
    // profile), so the list itself has to come from the API.
    [SOCKET_EVENTS.REGISTRATION_CREATED]: (p) => {
      patchRegistrationCounts(p);
      void queryClient.invalidateQueries({ queryKey: ['event-registrations', p.eventId] });
      invalidate('events-kpis');
    },
    [SOCKET_EVENTS.REGISTRATION_CANCELLED]: (p) => {
      patchRegistrationRow(p);
      patchRegistrationCounts(p);
    },
    [SOCKET_EVENTS.REGISTRATION_UPDATED]: (p) => {
      patchRegistrationRow(p);
      patchRegistrationCounts(p);
    },
    [SOCKET_EVENTS.REGISTRATION_CHECKED_IN]: (p) => {
      patchRegistrationRow(p);
      patchRegistrationCounts(p);
    },

    // ── Gallery ──
    [SOCKET_EVENTS.GALLERY_ALBUM_CREATED]: () => {
      invalidate('albums');
    },
    [SOCKET_EVENTS.GALLERY_ALBUM_UPDATED]: (p: GalleryAlbumPayload) => {
      const apply = (album: AlbumData): AlbumData => ({
        ...album,
        title: p.title,
        category: p.category as AlbumData['category'],
        isPublished: p.isPublished,
        coverImageUrl: p.coverImageUrl,
        _count: { ...album._count, photos: p.photoCount },
      });

      queryClient.setQueriesData<AlbumsCache>({ queryKey: ['albums'] }, (cached) => {
        if (!cached?.data?.albums) return cached;
        let hit = false;
        const albums = cached.data.albums.map((album) => {
          if (album.id !== p.id) return album;
          hit = true;
          return apply(album);
        });
        if (!hit) return cached;
        return { ...cached, data: { ...cached.data, albums } };
      });

      queryClient.setQueryData<AlbumCache>(['album', p.id], (cached) => {
        if (!cached?.data) return cached;
        return { ...cached, data: apply(cached.data) };
      });
    },
    [SOCKET_EVENTS.GALLERY_ALBUM_DELETED]: () => {
      invalidate('albums');
    },
    // The payload carries the real rows, so the grid can show the new photos
    // without a round trip.
    [SOCKET_EVENTS.GALLERY_PHOTOS_ADDED]: (p: GalleryPhotosPayload) => {
      queryClient.setQueryData<AlbumCache>(['album', p.albumId], (cached) => {
        if (!cached?.data) return cached;
        const existing = cached.data.photos ?? [];
        const known = new Set(existing.map((photo) => photo.id));
        // The uploading admin may already have these from their own response.
        const incoming: PhotoData[] = p.photos
          .filter((photo) => !known.has(photo.id))
          .map((photo) => ({
            id: photo.id,
            albumId: p.albumId,
            imageUrl: photo.imageUrl,
            thumbnailUrl: photo.thumbnailUrl,
            caption: photo.caption,
            sortOrder: photo.sortOrder,
            // Not on the wire; the emission time is the upload time.
            createdAt: p.at,
          }));
        if (incoming.length === 0) return cached;
        const photos = [...existing, ...incoming].sort((a, b) => a.sortOrder - b.sortOrder);
        return {
          ...cached,
          data: { ...cached.data, photos, _count: { ...cached.data._count, photos: p.photoCount } },
        };
      });

      patchAlbumPhotoCount(p.albumId, p.photoCount, p.photos.length);
    },
    [SOCKET_EVENTS.GALLERY_PHOTOS_DELETED]: (p) => {
      // A bulk delete can span albums, and then there is no single cache to patch.
      if (!p.albumId) {
        invalidate('album', 'albums');
        return;
      }
      const albumId = p.albumId;
      const doomed = new Set(p.photoIds);

      queryClient.setQueryData<AlbumCache>(['album', albumId], (cached) => {
        if (!cached?.data?.photos) return cached;
        const photos = cached.data.photos.filter((photo) => !doomed.has(photo.id));
        const removed = cached.data.photos.length - photos.length;
        if (removed === 0) return cached;
        return {
          ...cached,
          data: {
            ...cached.data,
            photos,
            // Count how many rows this cache actually dropped, not how many the
            // payload listed — a page may hold only some of the deleted ids.
            _count: {
              ...cached.data._count,
              photos: p.photoCount ?? Math.max(0, (cached.data._count?.photos ?? 0) - removed),
            },
          },
        };
      });

      patchAlbumPhotoCount(albumId, p.photoCount, -p.photoIds.length);
    },

    // ── Members ──
    [SOCKET_EVENTS.MEMBER_CREATED]: () => {
      invalidate('members', 'member-stats');
    },
    [SOCKET_EVENTS.MEMBER_UPDATED]: (p) => {
      patchMemberRow(p);
    },
    // Status and role moves re-bucket the member-stats tiles (active/pending/
    // suspended), which the per-member payload cannot describe.
    [SOCKET_EVENTS.MEMBER_APPROVED]: (p) => {
      patchMemberRow(p);
      invalidate('member-stats');
    },
    [SOCKET_EVENTS.MEMBER_STATUS_CHANGED]: (p) => {
      patchMemberRow(p);
      invalidate('member-stats');
    },
    [SOCKET_EVENTS.MEMBER_ROLE_CHANGED]: (p) => {
      patchMemberRow(p);
      invalidate('member-stats');
    },

    // ── Dashboard ──
    // The server sends DELTAS: only the counters it recomputed are present. Any
    // key absent from the payload must keep its cached value, so this merges
    // key-by-key instead of spreading the payload wholesale (which would also
    // drip `at`/`actorId` into the cached DashboardData).
    [SOCKET_EVENTS.DASHBOARD_UPDATED]: (p: DashboardCountersPayload) => {
      queryClient.setQueryData<DashboardCache>(['dashboard'], (cached) => {
        if (!cached) return cached;
        const next = { ...cached };
        if (p.totalMembers !== undefined) next.totalMembers = p.totalMembers;
        if (p.activeMembers !== undefined) next.activeMembers = p.activeMembers;
        if (p.pendingApprovals !== undefined) next.pendingApprovals = p.pendingApprovals;
        if (p.totalEvents !== undefined) next.totalEvents = p.totalEvents;
        if (p.upcomingEvents !== undefined) next.upcomingEvents = p.upcomingEvents;
        if (p.totalNotices !== undefined) next.totalNotices = p.totalNotices;
        if (p.totalAlbums !== undefined) next.totalAlbums = p.totalAlbums;
        if (p.totalPhotos !== undefined) next.totalPhotos = p.totalPhotos;
        if (p.totalRegistrations !== undefined) next.totalRegistrations = p.totalRegistrations;
        return next;
      });
    },

    // ── Misc ──
    // In-app notification banners are not built yet; the pending-approvals badge
    // is driven by the dashboard counters instead.
    [SOCKET_EVENTS.NOTIFICATION_NEW]: () => {
      /* no cache to touch yet */
    },
    [SOCKET_EVENTS.CONNECTION_READY]: () => {
      /* handshake ack; the provider tracks connectedness via `connect` */
    },
  };
}
