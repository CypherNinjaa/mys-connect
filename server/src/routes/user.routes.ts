import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';
import { UserController } from '../controllers/user.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = Router();

// Public route for location dropdowns
router.get('/cities', UserController.getCities);

// Protected routes (require Clerk authentication & DB user resolution)
router.use(requireAuth);
router.use(userResolver);

router.get('/me', UserController.getMe);
router.post('/register', UserController.register);
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);

export { router as userRoutes };
