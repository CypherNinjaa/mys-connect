import { Router } from 'express';
import { NoticeController } from '../controllers/notice.controller';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';

const router = Router();

router.use(requireAuth);
router.use(userResolver);

router.get('/', NoticeController.getNotices);
router.get('/:id', NoticeController.getNoticeById);
router.post('/:id/read', NoticeController.markAsRead);

export { router as noticeRoutes };
