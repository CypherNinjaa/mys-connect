import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';
import { requireRole } from '../middleware/rbac';
import { AdminController } from '../controllers/admin.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

const router = Router();

// Protect all admin routes with auth, user resolution, and SUPER_ADMIN/ADMIN role
router.use(requireAuth);
router.use(userResolver);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// ─── Dashboard ───────────────────────────
router.get('/dashboard', AdminController.getDashboard);

// ─── Users/Members ───────────────────────
router.get('/users', AdminController.listUsers);
router.post('/users/:id/status', AdminController.updateUserStatus);
router.post('/users/:id/role', AdminController.updateUserRole);

// ─── Events ──────────────────────────────
router.get('/events', AdminController.listEvents);
router.post('/events', AdminController.createEvent);
router.put('/events/:id', AdminController.updateEvent);
router.post('/events/:id/publish', AdminController.publishEvent);
router.post('/events/:id/cancel', AdminController.cancelEvent);
router.delete('/events/:id', AdminController.deleteEvent);
router.get('/events/:id/registrations', AdminController.getEventRegistrations);

// ─── Notices ─────────────────────────────
router.get('/notices', AdminController.listNotices);
router.post('/notices', AdminController.createNotice);
router.put('/notices/:id', AdminController.updateNotice);
router.post('/notices/:id/publish', AdminController.publishNotice);
router.delete('/notices/:id', AdminController.deleteNotice);

// ─── Gallery ─────────────────────────────
router.get('/gallery/albums', AdminController.listAlbums);
router.post('/gallery/albums', AdminController.createAlbum);
router.put('/gallery/albums/:id', AdminController.updateAlbum);
router.delete('/gallery/albums/:id', AdminController.deleteAlbum);
router.post('/gallery/albums/:id/photos', upload.array('photos', 50), AdminController.uploadPhotos);
router.delete('/gallery/photos/:id', AdminController.deletePhoto);

// ─── Audit Logs ──────────────────────────
router.get('/audit-logs', AdminController.listAuditLogs);

// ─── Settings ────────────────────────────
router.get('/settings', AdminController.getSettings);
router.put('/settings', AdminController.updateSettings);

export { router as adminRoutes };
