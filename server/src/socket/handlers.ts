/**
 * Inbound socket handlers.
 *
 * Deliberately thin. Clients subscribe and probe liveness; they never mutate
 * data over the socket — every write still goes through the REST API so the
 * existing auth, validation, rate limiting and audit trail all apply. Anything
 * resembling business logic belongs in a service, not here.
 */

import { logger } from '../utils/logger';
import { ROOM, type AppSocket } from './rooms';

/**
 * Cap on per-event subscriptions per connection. Without a ceiling a buggy or
 * hostile client could join unbounded rooms and grow the adapter's memory for
 * as long as it stays connected.
 */
const MAX_EVENT_SUBSCRIPTIONS = 40;

/** Prisma cuids only — keeps arbitrary strings out of room names. */
const ID_PATTERN = /^[a-z0-9]{20,32}$/i;

export function registerHandlers(socket: AppSocket): void {
  const subscribedEvents = new Set<string>();

  socket.on('event:subscribe', (eventId) => {
    if (typeof eventId !== 'string' || !ID_PATTERN.test(eventId)) {
      logger.debug(`Socket ${socket.id} sent an invalid event id to event:subscribe`);
      return;
    }
    if (subscribedEvents.has(eventId)) return;
    if (subscribedEvents.size >= MAX_EVENT_SUBSCRIPTIONS) {
      logger.warn(`Socket ${socket.id} hit the event subscription cap`);
      return;
    }

    subscribedEvents.add(eventId);
    void socket.join(ROOM.event(eventId));
  });

  socket.on('event:unsubscribe', (eventId) => {
    if (typeof eventId !== 'string' || !subscribedEvents.has(eventId)) return;
    subscribedEvents.delete(eventId);
    void socket.leave(ROOM.event(eventId));
  });

  /**
   * Application-level liveness probe. Socket.IO's own heartbeat is invisible to
   * app code, so mobile uses this to tell "connected" from "connected but the
   * carrier silently dropped the tunnel".
   */
  socket.on('ping', (nonce, ack) => {
    if (typeof ack === 'function') {
      ack({ pong: typeof nonce === 'string' ? nonce : '', at: new Date().toISOString() });
    }
  });

  // Socket.IO removes every listener bound to this socket on disconnect, and
  // `subscribedEvents` is closed over per connection, so it is collected with it.
  socket.on('disconnect', () => {
    subscribedEvents.clear();
  });
}
