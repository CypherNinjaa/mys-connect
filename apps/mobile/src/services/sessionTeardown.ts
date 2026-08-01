/**
 * Everything that must be released before signing out.
 *
 * Sign-out happens from four screens (settings, deactivated, network-error,
 * pending-approval). Each of them previously only released the push token, which
 * meant the in-memory caches and — once sockets landed — the live connection
 * survived into the next account on the same device. Centralising it here means
 * a new sign-out path cannot forget a step.
 *
 * Order matters: drop the socket first so the server stops sending frames for
 * rooms this device is about to lose access to, then clear the data those frames
 * would have written into.
 */

import { disconnectSocket } from './socket.service';
import { clearCacheSubscribers } from './cacheEvents';
import { EventCacheManager } from './eventCacheManager';
import { GalleryCacheManager } from './galleryCacheManager';
import { HomeCacheManager } from './homeCacheManager';
import { unregisterPushNotificationsAsync } from './notifications.service';

/**
 * Release the socket, caches and push token for the outgoing session.
 *
 * Never throws: a failure here must not block the member from signing out.
 */
export async function teardownSession(getToken: () => Promise<string | null>): Promise<void> {
  try {
    disconnectSocket();
  } catch {
    // Best effort — the socket is gone with the process either way.
  }

  try {
    clearCacheSubscribers();
    HomeCacheManager.invalidate();
    EventCacheManager.invalidate();
    GalleryCacheManager.invalidate();
  } catch {
    // Caches are memory-only; worst case the next account refetches.
  }

  // Still awaited: the server needs to hear about the token before the Clerk
  // session that authorises the call is torn down.
  await unregisterPushNotificationsAsync(getToken);
}
