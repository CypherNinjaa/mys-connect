/**
 * Socket.IO client singleton.
 *
 * One connection per browser tab, shared by every consumer. The module holds the
 * instance rather than React state so a remount (fast refresh, route change that
 * unmounts the provider for a beat) reuses the live socket instead of opening a
 * second one.
 *
 * Auth is a Clerk session JWT sent in the handshake. Those expire in ~60s, so the
 * token is re-read before every reconnect attempt — see `reconnect_attempt`.
 */

import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './socket-events';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Clerk's `getToken`, narrowed to what this module needs. */
export type TokenGetter = () => Promise<string | null>;

let socket: AppSocket | null = null;

// ─── Connection snapshot ─────────────────────────────────────────────────────
// This module owns the socket lifecycle, so it also owns the answer to "are we
// connected". Exposed as a subscribe/snapshot pair so React can read it through
// `useSyncExternalStore` instead of mirroring it into component state — which
// would mean a setState inside an effect on every connect/disconnect.

let connectionState = false;
const connectionListeners = new Set<() => void>();

function setConnectionState(next: boolean): void {
  if (connectionState === next) return;
  connectionState = next;
  for (const listener of connectionListeners) listener();
}

/** Subscribe to connect/disconnect. Returns the unsubscribe function. */
export function subscribeConnection(listener: () => void): () => void {
  connectionListeners.add(listener);
  return () => {
    connectionListeners.delete(listener);
  };
}

/** Current connectedness. Stable primitive, safe as a store snapshot. */
export function getConnectionSnapshot(): boolean {
  return connectionState;
}

/**
 * `NEXT_PUBLIC_API_URL` points at the REST base (…/api/v1) but Socket.IO is
 * mounted at the server root, so the API path suffix has to come off.
 */
function socketOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api/v1';
  return apiUrl.replace(/\/api\/v\d+\/?$/, '');
}

/** `connect_error` messages are prefixed by the server's handshake middleware. */
function isForbidden(message: string): boolean {
  return message.startsWith('FORBIDDEN');
}

function isUnauthorized(message: string): boolean {
  return message.startsWith('UNAUTHORIZED');
}

/**
 * Create (or return) the shared socket and start connecting.
 *
 * Reconnection is Socket.IO's own exponential backoff with jitter — 1s growing to
 * a 30s ceiling, ±50%, forever. Hand-rolling a retry loop on top of it would just
 * fight the manager, so the only thing added here is a fresh token per attempt.
 */
export function connect(getToken: TokenGetter): AppSocket {
  if (socket) {
    // Resync first: a socket that survived a remount is already connected and
    // will not fire `connect` again, so the snapshot has no other way to catch up.
    setConnectionState(socket.connected);
    if (!socket.connected) socket.connect();
    return socket;
  }

  const instance: AppSocket = io(socketOrigin(), {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    withCredentials: true,
    auth: {},
  });

  /** Put the newest Clerk JWT on the handshake for the next attempt. */
  const refreshToken = async (): Promise<void> => {
    try {
      const token = await getToken();
      instance.auth = token ? { token } : {};
    } catch {
      // Clerk is momentarily unavailable; keep the previous token and let the
      // manager retry. A failed refresh must not kill the backoff loop.
    }
  };

  // The manager fires this before each retry, which is the only safe moment to
  // swap the handshake payload — a token minted at first connect is long dead by
  // the time a reconnect happens, and would retry forever against a certain 401.
  instance.io.on('reconnect_attempt', () => {
    void refreshToken();
  });

  instance.on('connect', () => setConnectionState(true));
  instance.on('disconnect', () => setConnectionState(false));

  instance.on('connect_error', (err: Error) => {
    if (isForbidden(err.message)) {
      // Suspended/deactivated account. Retrying cannot fix this, and hammering the
      // handshake would just burn a DB lookup every 30s until the tab closes.
      instance.disconnect();
      return;
    }

    if (isUnauthorized(err.message)) {
      // Expired or not-yet-provisioned. Refresh and let the existing backoff carry
      // the retry — calling connect() here would bypass the delay.
      void refreshToken();
      return;
    }

    // Network/CORS/server-down: nothing to do, backoff already owns it.
  });

  socket = instance;

  // First connect needs a token too, and `getToken` is async — so kick off the
  // refresh and connect once it lands.
  void refreshToken().then(() => {
    // A fast unmount (or sign-out) can call disconnect() before the token
    // resolves; don't resurrect a socket that has already been torn down.
    if (socket === instance) instance.connect();
  });

  return instance;
}

/** Tear down the shared socket. Safe to call when nothing is connected. */
export function disconnect(): void {
  if (!socket) return;
  socket.io.off('reconnect_attempt');
  // Drops the internal connect/disconnect listeners too, so the snapshot has to
  // be set by hand rather than waiting for an event that will never arrive.
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  setConnectionState(false);
}

/** The live socket, or null when nothing has connected yet. */
export function getSocket(): AppSocket | null {
  return socket;
}
