/**
 * Wires the socket into the React lifecycle.
 *
 * Mounted once, from the member layout. It connects after Clerk confirms a
 * signed-in member, attaches the cache-sync listeners, and tears both down when
 * the member signs out or the layout unmounts — so a signed-out device never
 * holds an open socket, and a re-render never leaves a duplicate listener.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';
import {
  connectSocket,
  disconnectSocket,
  onSocketStateChange,
  isSocketConnected,
} from '../services/socket.service';
import { attachRealtimeSync, type RealtimeCallbacks } from '../services/realtimeSync';

export interface UseRealtimeResult {
  /** True while the socket is live. Drives the subtle connection indicator. */
  connected: boolean;
}

export function useRealtime(callbacks: RealtimeCallbacks = {}): UseRealtimeResult {
  const { isSignedIn, getToken } = useAuth();
  const [connected, setConnected] = useState<boolean>(isSocketConnected);

  // Callbacks are recreated every render by the caller. Holding them in a ref
  // means the connect effect does not need them as dependencies — otherwise the
  // socket would tear down and rebuild on every parent render. Assigned in an
  // effect, not during render: socket frames are only dispatched after commit.
  const callbacksRef = useRef<RealtimeCallbacks>(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const unsubscribe = onSocketStateChange(setConnected);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      // Covers both "never signed in" and "just signed out".
      disconnectSocket();
      return;
    }

    let cancelled = false;
    let detach: (() => void) | null = null;

    void connectSocket(getToken).then((socket) => {
      if (!socket) return;
      if (cancelled) {
        // Sign-out landed while the handshake was in flight.
        disconnectSocket();
        return;
      }

      detach = attachRealtimeSync(socket, {
        onUnreadCount: (count) => callbacksRef.current.onUnreadCount?.(count),
        onNotification: (payload) => callbacksRef.current.onNotification?.(payload),
        onOwnStatusChange: (status) => callbacksRef.current.onOwnStatusChange?.(status),
      });
    });

    return () => {
      cancelled = true;
      detach?.();
      detach = null;
    };
    // `getToken` is a new function reference on every Clerk render; including it
    // would reconnect the socket continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return { connected };
}
