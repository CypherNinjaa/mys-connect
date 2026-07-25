import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';
import { requireRole } from '../middleware/rbac';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

// Protect all admin routes with auth, user resolution, and SUPER_ADMIN/ADMIN role
router.use(requireAuth);
router.use(userResolver);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/users', AdminController.listUsers);
router.post('/users/:id/status', AdminController.updateUserStatus);
router.post('/users/:id/role', AdminController.updateUserRole);

export { router as adminRoutes };
