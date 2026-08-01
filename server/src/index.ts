import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initSocketServer } from './socket';

const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────
// Shares the HTTP server so realtime and REST live on one port and one CORS policy.
const io = initSocketServer(server);

server.listen(config.port, '0.0.0.0', () => {
  logger.info(`🚀 MYS Server running on port ${config.port} (0.0.0.0)`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
  logger.info(`📡 API base: http://localhost:${config.port}/api/v1`);
  logger.info(`🔌 Socket.IO: ws://localhost:${config.port}/socket.io`);
});

// ─── Graceful Shutdown ────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  // Close sockets first so clients get a clean disconnect and back off, rather
  // than seeing the TCP connection vanish and retrying immediately.
  void io.close(() => {
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});
