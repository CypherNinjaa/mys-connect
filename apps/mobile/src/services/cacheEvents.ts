/**
 * A tiny pub/sub so screens can react to cache changes.
 *
 * The existing cache managers are static singletons with no notification
 * mechanism: screens copy the cached array into `useState` once and never learn
 * that the cache moved underneath them. That was fine when the only writer was
 * the screen itself, but socket events now mutate the cache from outside the
 * React tree.
 *
 * Rather than rewrite the caches into a store (a much larger change, and one
 * that would risk the existing cache-first behaviour the user asked to
 * preserve), each cache publishes a bare "I changed" signal on a channel.
 * Subscribers re-read the cache themselves. No payload travels through here, so
 * there is no second copy of the data to drift out of sync.
 */

export type CacheChannel =
  | 'home'
  | 'events'
  | 'event-detail'
  | 'gallery'
  | 'notices'
  | 'notifications'
  | 'profile'
  | 'directory';

type Listener = () => void;

const channels = new Map<CacheChannel, Set<Listener>>();

/**
 * Subscribe to a channel. Returns an unsubscribe function — call it from a
 * `useEffect` cleanup, or the listener outlives the screen and leaks.
 */
export function subscribeToCache(channel: CacheChannel, listener: Listener): () => void {
  let listeners = channels.get(channel);
  if (!listeners) {
    listeners = new Set();
    channels.set(channel, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) channels.delete(channel);
  };
}

/** Notify subscribers that a channel's cache changed. */
export function publishCacheChange(channel: CacheChannel): void {
  const listeners = channels.get(channel);
  if (!listeners || listeners.size === 0) return;

  // Snapshot before iterating: a listener may unsubscribe itself in response.
  Array.from(listeners).forEach((listener) => {
    try {
      listener();
    } catch (error) {
      // One broken screen must not stop the others from updating.
      console.warn('[CACHE] Subscriber threw during notify', error);
    }
  });
}

/** Drop every subscriber. Used on sign-out, alongside cache invalidation. */
export function clearCacheSubscribers(): void {
  channels.clear();
}
