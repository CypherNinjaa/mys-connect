import { Router } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { userRoutes } from './user.routes';
import { adminRoutes } from './admin.routes';
import { webhookRoutes } from './webhook.routes';
import { memberRoutes } from './member.routes';
import { eventRoutes } from './event.routes';
import { noticeRoutes } from './notice.routes';
import { galleryRoutes } from './gallery.routes';
import { notificationRoutes } from './notification.routes';
import { testimonyRoutes } from './testimony.routes';

const router = Router();

// Apply rate limiting to API routes
router.use(apiLimiter);

// ─── Route Mounts ─────────────────────────
router.use('/users', userRoutes);
router.use('/members', memberRoutes);
router.use('/events', eventRoutes);
router.use('/notices', noticeRoutes);
router.use('/gallery', galleryRoutes);
router.use('/testimonies', testimonyRoutes);
router.use('/notifications', notificationRoutes);
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
      members: '/api/v1/members',
      events: '/api/v1/events',
      notices: '/api/v1/notices',
      gallery: '/api/v1/gallery',
      testimonies: '/api/v1/testimonies',
      notifications: '/api/v1/notifications',
      admin: '/api/v1/admin',
      webhooks: '/api/v1/webhooks',
    },
  });
});

export { router as apiRouter };
