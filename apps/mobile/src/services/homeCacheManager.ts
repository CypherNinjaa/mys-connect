export interface HomeCacheData {
  user: any;
  featuredEvents: any[];
  upcomingEvents: any[];
  timestamp: number;
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
  static setCachedData(data: { user: any; featuredEvents: any[]; upcomingEvents: any[] }): void {
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

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
