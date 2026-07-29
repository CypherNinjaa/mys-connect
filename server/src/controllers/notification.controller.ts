import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../middleware/errorHandler';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const notifications = await NotificationService.getNotifications(userId);
      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      await NotificationService.markAsRead(id, userId);
      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      await NotificationService.markAllAsRead(userId);
      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const count = await NotificationService.getUnreadCount(userId);
      res.json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerPushToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const { token, platform } = req.body;
      if (!token) throw new AppError('Push token is required', 400);

      await NotificationService.registerPushToken(userId, token, platform);
      res.json({
        success: true,
        message: 'Push token registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
