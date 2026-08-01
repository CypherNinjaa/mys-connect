import { publishCacheChange } from './cacheEvents';
import type { EventPatch } from './eventCacheManager';

export interface HomeCacheData {
  user: any;
  featuredEvents: any[];
  testimonies: any[];
  timestamp: number;
}

/**
 * The member fields carried on a `member:*` socket frame.
 *
 * Mirrors `MemberPayload` in `socket-events.ts`, minus the envelope. Everything
 * but `id` is optional so a narrow change (status only, role only) can be
 * applied without inventing the rest.
 */
export interface MemberPatch {
  id: string;
  fullName?: string | null;
  email?: string;
  memberId?: string | null;
  role?: string;
  status?: string;
  avatarUrl?: string | null;
  /** Flat city name. The nested `profile.city` relation is left untouched. */
  city?: string | null;
}

export class HomeCacheManager {
  private static cache: HomeCacheData | null = null;
  private static lastManualRefreshTimestamp: number = 0;
  private static TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  private static REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds manual refresh cooldown

  /**
   * Retrieves valid cached home screen data or returns null if expired/empty
   */
  static getCachedData(): HomeCacheData | null {
    if (!this.cache) return null;
    const isExpired = Date.now() - this.cache.timestamp > this.TTL_MS;
    if (isExpired) {
      this.cache = null;
      return null;
    }
    return this.cache;
  }

  /**
   * Caches fresh home data with timestamp
   */
  static setCachedData(data: { user: any; featuredEvents: any[]; testimonies: any[] }): void {
    this.cache = {
      ...data,
      timestamp: Date.now(),
    };
  }

  /**
   * Rate-limiting check for manual pull-to-refresh
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
  // Home shows two slices of the same event list, so an event change has to be
  // applied to both. The member card is patched separately when an admin
  // approves the account or changes its role.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Apply an event update to featured events on home. */
  static patchEvent(event: EventPatch): void {
    if (!this.cache) return;

    const apply = (list: any[]) => {
      const index = list.findIndex((item) => item?.id === event.id);
      if (index === -1) return { list, changed: false };
      const next = [...list];
      next[index] = { ...next[index], ...event };
      return { list: next, changed: true };
    };

    const featured = apply(this.cache.featuredEvents);
    if (!featured.changed) return;

    this.cache.featuredEvents = featured.list;
    publishCacheChange('home');
  }

  /** Remove a deleted or unpublished event from home. */
  static removeEvent(eventId: string): void {
    if (!this.cache) return;

    const featured = this.cache.featuredEvents.filter((item: any) => item?.id !== eventId);
    if (featured.length === this.cache.featuredEvents.length) {
      return;
    }

    this.cache.featuredEvents = featured;
    publishCacheChange('home');
  }

  /** Merge changes into the cached member record (approval, role, profile edit). */
  static patchUser(user: MemberPatch): void {
    if (!this.cache || !this.cache.user) return;

    // Copy field by field rather than spreading: the caller hands us a socket
    // payload, which also carries envelope fields (`at`, `actorId`) that have no
    // business in the cached user row. `city` is skipped too — it is flat on the
    // wire but lives under `profile.city.name` here.
    const patch: Record<string, unknown> = {};
    if (user.fullName !== undefined) patch.fullName = user.fullName;
    if (user.email !== undefined) patch.email = user.email;
    if (user.memberId !== undefined) patch.memberId = user.memberId;
    if (user.role !== undefined) patch.role = user.role;
    if (user.status !== undefined) patch.status = user.status;
    if (user.avatarUrl !== undefined) patch.avatarUrl = user.avatarUrl;
    if (Object.keys(patch).length === 0) return;

    this.cache.user = { ...this.cache.user, ...patch };
    publishCacheChange('home');
  }

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
