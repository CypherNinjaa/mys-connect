export interface GalleryCacheData {
  items: any[];
  albums: any[];
  timestamp: number;
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

  /**
   * Invalidates local cache
   */
  static invalidate(): void {
    this.cache = null;
  }
}
