import http from 'http';
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const server = http.createServer(app);

// ─── Socket.io will be initialized here later ──

server.listen(config.port, '0.0.0.0', () => {
  logger.info(`🚀 MYS Server running on port ${config.port} (0.0.0.0)`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
  logger.info(`📡 API base: http://localhost:${config.port}/api/v1`);
});

// ─── Graceful Shutdown ────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});
