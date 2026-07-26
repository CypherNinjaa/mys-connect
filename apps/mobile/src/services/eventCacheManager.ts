export interface EventCacheEntry {
  events: any[];
  timestamp: number;
}

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
    }
  }

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
