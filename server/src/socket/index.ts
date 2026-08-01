/**
 * Socket.IO bootstrap.
 *
 * Owns exactly three things: creating the server, authenticating handshakes, and
 * handing the authenticated socket to the handlers module. No business logic and
 * no Prisma writes live here — see `emitters.ts` for the outbound side.
 */

import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from '@clerk/express';
import { UserStatus } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { registerHandlers } from './handlers';
import { joinUserRooms, type AppSocket } from './rooms';
import { setIO } from './io';
import { SOCKET_EVENTS } from './events';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events';

export type AppIOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Pull the Clerk session token out of the handshake, whichever way the client sent it. */
function extractToken(socket: AppSocket): string | null {
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  if (typeof auth?.token === 'string' && auth.token.length > 0) {
    return auth.token;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }

  return null;
}

/**
 * Handshake gate. Verifies the Clerk JWT, loads the DB user, and rejects anyone
 * who is not ACTIVE — a deactivated account must not hold a live stream open.
 *
 * Runs once per connection, not per event, so the DB hit here is cheap.
 */
async function authenticate(socket: AppSocket, next: (err?: Error) => void): Promise<void> {
  try {
    const token = extractToken(socket);
    if (!token) {
      return next(new Error('UNAUTHORIZED: missing token'));
    }

    // Networkless signature check against Clerk's JWKS.
    const claims = await verifyToken(token, { secretKey: config.clerkSecretKey });
    const clerkId = claims.sub;
    if (!clerkId) {
      return next(new Error('UNAUTHORIZED: invalid token'));
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        role: true,
        status: true,
        profile: { select: { city: { select: { name: true } } } },
      },
    });

    if (!user) {
      // The REST userResolver auto-provisions DB users. A socket must not create
      // rows as a side effect, so we ask the client to call the API first.
      return next(new Error('UNAUTHORIZED: user not provisioned'));
    }

    if (user.status !== UserStatus.ACTIVE) {
      return next(new Error(`FORBIDDEN: account ${user.status.toLowerCase()}`));
    }

    socket.data.userId = user.id;
    socket.data.clerkId = user.clerkId;
    socket.data.role = user.role;
    socket.data.status = user.status;
    socket.data.chapter = user.profile?.city?.name ?? null;
    socket.data.rooms = [];

    next();
  } catch (error) {
    // Expired or malformed tokens are routine — the client will refresh and retry.
    const message = error instanceof Error ? error.message : 'token verification failed';
    logger.debug(`Socket handshake rejected: ${message}`);
    next(new Error('UNAUTHORIZED: token verification failed'));
  }
}

/**
 * Attach Socket.IO to the existing HTTP server so REST and websockets share one
 * port and one CORS policy.
 */
export function initSocketServer(httpServer: HttpServer): AppIOServer {
  const io: AppIOServer = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, callback) => {
        // Native apps send no Origin header at all; browsers must match the allow-list.
        if (!origin || config.nodeEnv === 'development') return callback(null, true);
        if (config.corsOrigins.includes(origin)) return callback(null, true);
        callback(null, false);
      },
      credentials: true,
    },
    // Mobile networks drop idle sockets; these keep a dead peer from lingering
    // for minutes while staying well inside typical carrier NAT timeouts.
    pingInterval: 25_000,
    pingTimeout: 20_000,
    // Expo's client upgrades to websocket immediately; polling stays as a fallback
    // for restrictive networks.
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
  });

  io.use((socket, next) => {
    void authenticate(socket, next);
  });

  io.on('connection', (socket) => {
    const rooms = joinUserRooms(socket);

    logger.info(
      `🔌 Socket connected ${socket.id} · user=${socket.data.userId} role=${socket.data.role} rooms=[${rooms.join(', ')}]`,
    );

    socket.emit(SOCKET_EVENTS.CONNECTION_READY, {
      socketId: socket.id,
      userId: socket.data.userId,
      role: socket.data.role,
      rooms,
      at: new Date().toISOString(),
    });

    registerHandlers(socket);

    socket.on('disconnect', (reason) => {
      logger.debug(`🔌 Socket disconnected ${socket.id} (${reason})`);
    });

    socket.on('error', (err: Error) => {
      logger.warn(`Socket error on ${socket.id}: ${err.message}`);
    });
  });

  setIO(io);
  logger.info('📡 Socket.IO initialised at /socket.io');
  return io;
}

export { SOCKET_EVENTS } from './events';
export { getIO } from './io';
