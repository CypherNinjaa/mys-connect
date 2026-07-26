import { Request, Response, NextFunction } from 'express';
import { NoticeService } from '../services/notice.service';
import { NoticeType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class NoticeController {
  static async getNotices(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-expect-error - Attached by userResolver
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const category = req.query.category as NoticeType | undefined;
      const notices = await NoticeService.getNotices(userId, category);

      res.json({
        success: true,
        data: notices,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNoticeById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      // @ts-expect-error - Attached by userResolver
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const notice = await NoticeService.getNoticeById(id, userId);

      res.json({
        success: true,
        data: notice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      // @ts-expect-error - Attached by userResolver
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      await NoticeService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notice marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}
