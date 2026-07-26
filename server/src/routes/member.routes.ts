import { Router } from 'express';
import { MemberController } from '../controllers/member.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Member directory is accessible in guest (limited) and member (full) mode
router.use(optionalAuth);

router.get('/', MemberController.getMembers);
router.get('/:id', MemberController.getMemberById);

export { router as memberRoutes };
