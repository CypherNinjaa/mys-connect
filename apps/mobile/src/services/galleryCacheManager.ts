import { publishCacheChange } from './cacheEvents';

export interface GalleryCacheData {
  items: any[];
  albums: any[];
  timestamp: number;
}

/** One photo row as it arrives on `gallery:photosAdded`. */
export interface GalleryPhotoPatch {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
}

/** One album row as it arrives on `gallery:album*`. */
export interface GalleryAlbumPatch {
  id: string;
  title: string;
  category: string | null;
  isPublished: boolean;
  coverImageUrl: string | null;
  photoCount: number;
}

export class GalleryCacheManager {
  private static cache: GalleryCacheData | null = null;
  private static lastManualRefreshTimestamp: number = 0;
  private static TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  private static REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds manual refresh cooldown

  /**
   * Retrieves non-expired cached gallery data or returns null if expired/empty
   */
  static getCachedData(): GalleryCacheData | null {
    if (!this.cache) return null;
    const isExpired = Date.now() - this.cache.timestamp > this.TTL_MS;
    if (isExpired) {
      this.cache = null;
      return null;
    }
    return this.cache;
  }

  /**
   * Stores fresh gallery data in local memory cache with timestamp
   */
  static setCachedData(data: { items: any[]; albums: any[] }): void {
    this.cache = {
      items: data.items || [],
      albums: data.albums || [],
      timestamp: Date.now(),
    };
  }

  /**
   * Rate limiting check for manual pull-to-refresh
   */
  static canManualRefresh(): { allowed: boolean; remainingSeconds: number } {
    const elapsed = Date.now() - this.lastManualRefreshTimestamp;
    if (elapsed < this.REFRESH_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((this.REFRESH_COOLDOWN_MS - elapsed) / 1000);
      return { allowed: false, remainingSeconds };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  /**
   * Records successful manual refresh timestamp
   */
  static recordManualRefresh(): void {
    this.lastManualRefreshTimestamp = Date.now();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Realtime patches
  //
  // The gallery is the case the user called out specifically: when an admin
  // finishes a Cloudinary upload the new photos should appear without a refresh.
  // The socket payload carries the actual photo rows, so we insert them directly
  // instead of triggering a refetch.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Insert newly uploaded photos at the front of the feed and bump the album count. */
  static insertPhotos(albumId: string, photos: GalleryPhotoPatch[]): void {
    if (!this.cache || !Array.isArray(photos) || photos.length === 0) return;

    const known = new Set(this.cache.items.map((item) => item?.id));
    const fresh = photos.filter((photo) => photo?.id && !known.has(photo.id));
    if (fresh.length === 0) return;

    // The feed is flat — each item carries its album's title and category so the
    // category tabs and search can filter without a join. The socket payload is
    // per-photo, so borrow those two fields from the album we already hold.
    const album = this.cache.albums.find((entry) => entry?.id === albumId);
    const enriched = fresh.map((photo) => ({
      ...photo,
      albumId,
      albumTitle: album?.title,
      title: photo.caption ?? album?.title,
      category: album?.category ?? 'Others',
    }));

    // Newest first — matches how the feed is ordered on the server.
    this.cache.items = [...enriched, ...this.cache.items];
    this.cache.albums = this.cache.albums.map((album) =>
      album?.id === albumId
        ? {
            ...album,
            photoCount: (album.photoCount ?? album?._count?.photos ?? 0) + fresh.length,
            _count: {
              ...(album._count ?? {}),
              photos: (album?._count?.photos ?? album.photoCount ?? 0) + fresh.length,
            },
          }
        : album
    );
    publishCacheChange('gallery');
  }

  /** Remove photos an admin deleted. */
  static removePhotos(albumId: string | null, photoIds: string[]): void {
    if (!this.cache || !Array.isArray(photoIds) || photoIds.length === 0) return;

    const doomed = new Set(photoIds);
    const nextItems = this.cache.items.filter((item) => !doomed.has(item?.id));
    if (nextItems.length === this.cache.items.length) return;

    const removed = this.cache.items.length - nextItems.length;
    this.cache.items = nextItems;
    this.cache.albums = this.cache.albums.map((album) =>
      album?.id === albumId
        ? {
            ...album,
            photoCount: Math.max(0, (album.photoCount ?? album?._count?.photos ?? 0) - removed),
            _count: {
              ...(album._count ?? {}),
              photos: Math.max(0, (album?._count?.photos ?? album.photoCount ?? 0) - removed),
            },
          }
        : album
    );
    publishCacheChange('gallery');
  }

  /** Replace one album's metadata (title, cover, visibility) in place. */
  static patchAlbum(album: GalleryAlbumPatch): void {
    if (!this.cache) return;

    const index = this.cache.albums.findIndex((existing) => existing?.id === album.id);
    if (index === -1) return;

    const next = [...this.cache.albums];
    next[index] = { ...next[index], ...album };
    this.cache.albums = next;
    publishCacheChange('gallery');
  }

  /** Add a newly published album. */
  static insertAlbum(album: GalleryAlbumPatch): void {
    if (!this.cache) return;
    if (this.cache.albums.some((existing) => existing?.id === album.id)) {
      this.patchAlbum(album);
      return;
    }

    this.cache.albums = [album, ...this.cache.albums];
    publishCacheChange('gallery');
  }

  /** Drop a deleted album together with its photos. */
  static removeAlbum(albumId: string): void {
    if (!this.cache) return;

    const nextAlbums = this.cache.albums.filter((album) => album?.id !== albumId);
    const nextItems = this.cache.items.filter((item) => item?.albumId !== albumId);
    if (nextAlbums.length === this.cache.albums.length && nextItems.length === this.cache.items.length) {
      return;
    }

    this.cache.albums = nextAlbums;
    this.cache.items = nextItems;
    publishCacheChange('gallery');
  }

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
