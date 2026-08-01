/**
 * Holds the live Socket.IO instance.
 *
 * This exists as its own module purely to break an import cycle: `emitters.ts`
 * needs the server instance, and `index.ts` imports the handlers which sit
 * alongside the emitters. A one-value holder keeps the dependency arrow pointing
 * one way.
 */

import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events';

type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: IOServer | null = null;

export function setIO(instance: IOServer): void {
  io = instance;
}

/**
 * The live server, or null before `initSocketServer` has run.
 *
 * Callers must tolerate null: seed scripts, migrations and unit tests all import
 * the services without ever booting an HTTP server, and a missing socket layer
 * must never break a database write.
 */
export function getIO(): IOServer | null {
  return io;
}

/** Test/shutdown hook. */
export function clearIO(): void {
  io = null;
}
