'use client';

/**
 * Owns the realtime connection for the whole dashboard.
 *
 * Mounted inside DashboardLayout, which is already a Client Component, already
 * auth-gated by the (dashboard) server layout, and already below
 * QueryClientProvider — so `useQueryClient()` here is guaranteed to resolve.
 *
 * Listeners are registered in one effect and every one is removed in its cleanup.
 * Leaking a listener across a remount would apply each cache patch twice.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  connect,
  disconnect,
  getConnectionSnapshot,
  subscribeConnection,
} from '@/lib/socket';
import { createCacheHandlers } from '@/lib/socket-cache';
import type { ServerToClientEvents } from '@/lib/socket-events';

interface SocketContextValue {
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ connected: false });

/**
 * Realtime connection state. Returns `connected: false` outside the provider
 * rather than throwing, so a component can show a status dot without caring
 * whether it is mounted inside the dashboard shell.
 */
export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const queryClient = useQueryClient();

  // The socket module is the source of truth for connectedness, so it is read as
  // an external store. Copying it into component state would mean a setState in
  // an effect on every connect and disconnect. Third argument is the SSR
  // snapshot: there is no socket on the server, so it is always false.
  const socketConnected = useSyncExternalStore(
    subscribeConnection,
    getConnectionSnapshot,
    () => false,
  );

  // Clerk hands back a fresh `getToken` identity on some renders. Holding it in a
  // ref keeps the connect effect from tearing the socket down and rebuilding it
  // on an unrelated re-render. Assigned in an effect, never during render —
  // `react-hooks/refs` treats a render-phase ref write as an error.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Stable across renders, so it is safe as an effect dependency.
  const readToken = useCallback(() => getTokenRef.current(), []);

  // Signed-out is definitionally disconnected, so it is derived rather than
  // pushed through setState — that keeps the sign-out branch below free of a
  // synchronous state write (and the cascading render it would cause).
  const connected = isSignedIn ? socketConnected : false;

  useEffect(() => {
    // Wait for Clerk to resolve; connecting before that would hand over a null
    // token and burn a guaranteed-rejected handshake.
    if (!isLoaded) return;

    if (!isSignedIn) {
      // Covers sign-out while the dashboard is open.
      disconnect();
      return;
    }

    // `connect` also resyncs the connection store, so nothing has to be seeded
    // here for a socket that survived a remount.
    const socket = connect(readToken);
    const handlers = createCacheHandlers(queryClient);

    // One loop keeps registration and removal provably symmetric — the same
    // entries drive both, so a listener cannot be added without being removed.
    //
    // The cast is confined to this binding step. Socket.IO's `on` resolves its
    // listener type from a *literal* event name; over a union of event names that
    // conditional type cannot reduce, so neither a generic helper nor a tuple
    // spread type-checks (both were tried). Payload correctness is not weakened:
    // `createCacheHandlers` is typed as `ServerToClientEvents`, so every handler
    // is checked against its own event where it is written.
    const entries = Object.entries(handlers) as [
      keyof ServerToClientEvents,
      ServerToClientEvents[keyof ServerToClientEvents],
    ][];
    for (const [event, handler] of entries) {
      socket.on(event, handler as never);
    }

    return () => {
      for (const [event, handler] of entries) {
        socket.off(event, handler as never);
      }
    };
  }, [isLoaded, isSignedIn, queryClient, readToken]);

  // Drop the connection when the dashboard shell itself goes away.
  useEffect(() => () => disconnect(), []);

  const value = useMemo(() => ({ connected }), [connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
