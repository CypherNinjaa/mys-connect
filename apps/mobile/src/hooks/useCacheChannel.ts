/**
 * Re-read a cache when something patches it.
 *
 * Screens copy cached data into local state on mount. When a socket event
 * patches that cache the screen has no way to notice, so it subscribes here and
 * re-reads. The callback should read from the cache manager and `setState` —
 * it must not call the API, which is what keeps the cache-first, manual-refresh
 * contract intact.
 */

import { useEffect, useRef } from 'react';
import { subscribeToCache, type CacheChannel } from '../services/cacheEvents';

export function useCacheChannel(channel: CacheChannel, onChange: () => void): void {
  // Held in a ref so an inline arrow at the call site does not resubscribe on
  // every render. Updated in an effect rather than during render — cache
  // notifications only ever arrive after commit, so the effect always wins the
  // race.
  const handlerRef = useRef(onChange);

  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return subscribeToCache(channel, () => handlerRef.current());
  }, [channel]);
}
