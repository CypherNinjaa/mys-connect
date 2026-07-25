import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { userRoutes } from './user.routes';
import { adminRoutes } from './admin.routes';
import { webhookRoutes } from './webhook.routes';

const router = Router();

// Apply rate limiting to API routes
router.use(apiLimiter);

// ─── Route Mounts ─────────────────────────
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);

// ─── Base Index ───────────────────────────
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'MYS CONNECT API v1',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/v1/users',
      admin: '/api/v1/admin',
      webhooks: '/api/v1/webhooks',
    },
  });
});

export { router as apiRouter };
