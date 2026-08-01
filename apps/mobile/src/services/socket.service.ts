/**
 * Socket.IO client for the member app.
 *
 * Responsibilities, and the reasoning behind them:
 *
 * - **Auth-gated.** The socket is only ever connected while Clerk reports a
 *   signed-in member. The handshake carries a fresh Clerk JWT; the server
 *   verifies it and refuses anything that is not an ACTIVE account.
 * - **Reconnects itself.** Socket.IO's built-in backoff does the waiting, with
 *   jitter, so a server restart does not produce a synchronised stampede from
 *   every handset. We only intervene for the two cases it cannot know about:
 *   an expired token (needs a new one before retrying) and the app coming back
 *   to the foreground (needs an immediate attempt, not the remaining backoff).
 * - **Silent.** A dead socket must never surface an error to the member. The app
 *   still works exactly as it did before sockets existed — cache-first reads and
 *   manual pull-to-refresh — realtime is an enhancement layered on top.
 *
 * This module owns the connection only. What to do with the events it receives
 * lives in `realtimeSync.ts`, so transport and cache logic stay separable.
 */

import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { NETWORK_CONFIG, whenNetworkReady } from '../config/network.config';
import type { ClientToServerEvents, ServerToClientEvents } from './socket-events';

export type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * The socket lives at the server root, but the REST base URL carries the
 * `/api/v1` prefix. The network config already knows how to strip it.
 */
function socketOrigin(): string {
  return NETWORK_CONFIG.origin;
}

type TokenProvider = () => Promise<string | null>;

let socket: AppClientSocket | null = null;
let tokenProvider: TokenProvider | null = null;
let appStateSub: NativeEventSubscription | null = null;

/**
 * Connection state, readable from module scope.
 *
 * The push-notification handler is a module-level side effect evaluated at
 * import time, so it cannot read React state. It reads this instead.
 */
let connected = false;

export function isSocketConnected(): boolean {
  return connected;
}

/** Listeners for connection-state changes, for the small status indicator. */
const stateListeners = new Set<(isConnected: boolean) => void>();

export function onSocketStateChange(listener: (isConnected: boolean) => void): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function setConnected(next: boolean): void {
  if (connected === next) return;
  connected = next;
  stateListeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // A misbehaving listener must not break the transport.
    }
  });
}

/**
 * Records pushes that also arrived over the socket, so the foreground banner can
 * be suppressed for them.
 *
 * Keyed by entity rather than notification id because the push and the socket
 * frame are produced by different code paths and only agree on what changed.
 * Entries are pruned on read; the window is deliberately short.
 */
const DEDUPE_WINDOW_MS = 20_000;
const socketDelivered = new Map<string, number>();

function dedupeKey(type: unknown, entityId: unknown): string | null {
  if (!type || !entityId) return null;
  return `${String(type).toUpperCase()}:${String(entityId)}`;
}

/** Called by the realtime sync layer when a socket notification also went out as a push. */
export function markDeliveredViaSocket(data: Record<string, unknown> | undefined): void {
  const key =
    dedupeKey(data?.type, data?.eventId ?? data?.noticeId ?? data?.albumId ?? data?.entityId) ??
    null;
  if (!key) return;
  socketDelivered.set(key, Date.now());
}

/**
 * True when this push duplicates something the socket already showed.
 *
 * Defaults to false: if we cannot positively match the push to a socket frame,
 * it gets shown. A duplicate banner is a small annoyance; a swallowed
 * notification is a missed announcement.
 */
export function wasDeliveredViaSocket(data: Record<string, unknown> | undefined): boolean {
  const now = Date.now();
  socketDelivered.forEach((at, key) => {
    if (now - at > DEDUPE_WINDOW_MS) socketDelivered.delete(key);
  });

  const key = dedupeKey(
    data?.type,
    data?.eventId ?? data?.noticeId ?? data?.albumId ?? data?.entityId,
  );
  if (!key) return false;

  const at = socketDelivered.get(key);
  return at !== undefined && now - at <= DEDUPE_WINDOW_MS;
}

/** Event rooms this client has asked to join, replayed after a reconnect. */
const subscribedEvents = new Set<string>();

export function subscribeToEvent(eventId: string): void {
  if (!eventId) return;
  subscribedEvents.add(eventId);
  socket?.emit('event:subscribe', eventId);
}

export function unsubscribeFromEvent(eventId: string): void {
  if (!eventId) return;
  subscribedEvents.delete(eventId);
  socket?.emit('event:unsubscribe', eventId);
}

/**
 * Refresh the handshake token before a reconnect attempt.
 *
 * Clerk JWTs are short-lived. Without this, a socket that drops and comes back
 * an hour later would keep retrying with a token the server has already
 * rejected, and back off forever on an error it could have fixed.
 */
async function refreshHandshakeToken(): Promise<void> {
  if (!socket || !tokenProvider) return;
  try {
    const token = await tokenProvider();
    if (token) socket.auth = { token };
  } catch {
    // Keep the previous token; the attempt may still succeed.
  }
}

function handleAppStateChange(state: AppStateStatus): void {
  if (state !== 'active' || !socket) return;

  // Coming back to the foreground: the OS may have frozen the socket while
  // backgrounded without the client noticing. Force an attempt now rather than
  // waiting out whatever backoff delay was pending.
  if (!socket.connected) {
    void refreshHandshakeToken().then(() => socket?.connect());
  }
}

/**
 * Open the socket. Idempotent — calling it twice does not create a second
 * connection, so it is safe from an effect that may re-run.
 */
export async function connectSocket(getToken: TokenProvider): Promise<AppClientSocket | null> {
  tokenProvider = getToken;

  if (socket) {
    if (!socket.connected) {
      await refreshHandshakeToken();
      socket.connect();
    }
    return socket;
  }

  // Wait for the API address to settle before building the socket. In dev the
  // config may still be probing candidates, and Socket.IO fixes its URI at
  // construction time — connecting early would pin an address we are about to
  // discard. Resolution is already in flight, so this is usually instant.
  await whenNetworkReady();

  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    return null;
  }
  if (!token) return null;

  socket = io(socketOrigin(), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    // Spreads retries across clients so a restarted server is not hit by every
    // handset at the same instant.
    randomizationFactor: 0.5,
    timeout: 20_000,
  });

  socket.on('connect', () => {
    setConnected(true);
    // Re-join event rooms: room membership lives on the server-side socket, which
    // is gone after a disconnect.
    subscribedEvents.forEach((eventId) => socket?.emit('event:subscribe', eventId));
  });

  socket.on('disconnect', () => {
    setConnected(false);
  });

  socket.io.on('reconnect_attempt', () => {
    // Fire-and-forget: the attempt proceeds with the old token if this loses the
    // race, and the following attempt will carry the refreshed one.
    void refreshHandshakeToken();
  });

  socket.on('connect_error', (error: Error) => {
    setConnected(false);
    const message = error?.message ?? '';

    if (message.startsWith('FORBIDDEN')) {
      // The account is deactivated or rejected. Retrying cannot help; the auth
      // gate handles signing the member out.
      socket?.io.opts.reconnection && (socket.io.opts.reconnection = false);
      return;
    }

    if (message.startsWith('UNAUTHORIZED')) {
      // Usually an expired token — refresh it and let backoff try again.
      void refreshHandshakeToken();
      return;
    }

    // Anything else is a network problem. Built-in backoff handles it.
  });

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', handleAppStateChange);
  }

  socket.connect();
  return socket;
}

/**
 * Tear everything down. Called on sign-out — a socket left open would keep
 * streaming the previous member's rooms to the device.
 */
export function disconnectSocket(): void {
  subscribedEvents.clear();
  socketDelivered.clear();
  tokenProvider = null;

  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  setConnected(false);
}

export function getSocket(): AppClientSocket | null {
  return socket;
}
