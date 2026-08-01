import { publishCacheChange } from './cacheEvents';

export interface EventCacheEntry {
  events: any[];
  timestamp: number;
}

/**
 * One event row as it arrives on an `event:*` socket frame.
 *
 * Only `id` is required: a counter-only frame carries two fields, a full update
 * carries all of them. The field set mirrors `EventPayload` in
 * `socket-events.ts` plus the two derived seat counters the screens read.
 */
export interface EventPatch {
  id: string;
  title?: string;
  status?: string;
  chapter?: string | null;
  category?: string | null;
  startDate?: string;
  endDate?: string | null;
  venue?: string | null;
  isPublished?: boolean;
  coverImageUrl?: string | null;
  maxAttendees?: number | null;
  registrationOpen?: boolean;
  qrScanLimit?: number;
  registrationCount?: number;
  remainingSeats?: number | null;
}

/** A patch complete enough to render as a new card in the list. */
export type NewEventPatch = EventPatch & { title: string; startDate: string };

export class EventCacheManager {
  private static cache: EventCacheEntry | null = null;
  private static lastManualRefreshTimestamp: number = 0;
  private static TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
  private static REFRESH_COOLDOWN_MS = 30 * 1000; // 30 seconds manual refresh cooldown

  /**
   * Retrieves non-expired cached events array or returns null if expired/empty
   */
  static getCachedEvents(): any[] | null {
    if (!this.cache) return null;
    const isExpired = Date.now() - this.cache.timestamp > this.TTL_MS;
    if (isExpired) {
      this.cache = null;
      return null;
    }
    return this.cache.events;
  }

  /**
   * Stores fresh events array in local memory cache with timestamp
   */
  static setCachedEvents(events: any[]): void {
    this.cache = {
      events: events || [],
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

  /**
   * Optimistically updates registration state of an event inside cache
   */
  static updateRegistrationInCache(eventId: string, isRegistered: boolean): void {
    if (this.cache && Array.isArray(this.cache.events)) {
      this.cache.events = this.cache.events.map((evt) =>
        evt.id === eventId ? { ...evt, isRegistered } : evt
      );
      publishCacheChange('events');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Realtime patches
  //
  // Each of these mutates one row and publishes on the 'events' channel, so open
  // screens re-read without an API call. They deliberately no-op when the cache
  // is cold: there is nothing on screen to patch, and the next read will fetch
  // the current state anyway.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Replace a single event in place, preserving client-only fields like `isRegistered`. */
  static patchEvent(event: EventPatch): void {
    if (!this.cache || !Array.isArray(this.cache.events)) return;

    const index = this.cache.events.findIndex((evt) => evt.id === event.id);
    if (index === -1) return;

    // Merge rather than replace: the socket payload is the server's view and does
    // not carry per-member flags the screen depends on.
    const next = [...this.cache.events];
    next[index] = { ...next[index], ...event };
    this.cache.events = next;
    publishCacheChange('events');
  }

  /** Insert a newly published event at its chronological position. */
  static insertEvent(event: NewEventPatch): void {
    if (!this.cache || !Array.isArray(this.cache.events)) return;
    if (this.cache.events.some((evt) => evt.id === event.id)) {
      this.patchEvent(event);
      return;
    }

    const next = [...this.cache.events, event].sort((a, b) => {
      const aTime = new Date(a?.startDate ?? 0).getTime();
      const bTime = new Date(b?.startDate ?? 0).getTime();
      return aTime - bTime;
    });
    this.cache.events = next;
    publishCacheChange('events');
  }

  /** Drop an event that was deleted or unpublished. */
  static removeEvent(eventId: string): void {
    if (!this.cache || !Array.isArray(this.cache.events)) return;

    const next = this.cache.events.filter((evt) => evt.id !== eventId);
    if (next.length === this.cache.events.length) return;

    this.cache.events = next;
    publishCacheChange('events');
  }

  /** Update only the seat counters on one event — used for live RSVP totals. */
  static patchCounters(
    eventId: string,
    counters: { registrationCount?: number; remainingSeats?: number | null }
  ): void {
    if (!this.cache || !Array.isArray(this.cache.events)) return;

    const index = this.cache.events.findIndex((evt) => evt.id === eventId);
    if (index === -1) return;

    const next = [...this.cache.events];
    next[index] = {
      ...next[index],
      ...(counters.registrationCount !== undefined
        ? {
            registrationCount: counters.registrationCount,
            _count: { ...(next[index]?._count ?? {}), rsvps: counters.registrationCount },
          }
        : {}),
      ...(counters.remainingSeats !== undefined ? { remainingSeats: counters.remainingSeats } : {}),
    };
    this.cache.events = next;
    publishCacheChange('events');
  }

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
