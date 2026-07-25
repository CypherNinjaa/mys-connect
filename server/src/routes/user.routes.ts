import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';
import { UserController } from '../controllers/user.controller';

const router = Router();

// Public route for location dropdowns
router.get('/cities', UserController.getCities);

// Protected routes (require Clerk authentication & DB user resolution)
router.use(requireAuth);
router.use(userResolver);

router.get('/me', UserController.getMe);
router.post('/register', UserController.register);

export { router as userRoutes };
