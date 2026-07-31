import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { AppError } from '../middleware/errorHandler';

export class EventController {
  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const rawStatus = (req.query.status as string)?.toUpperCase();
      const status = rawStatus as any;
      const search = req.query.search as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const userId = req.user?.id;

      const data = await EventService.getEvents({ status, search, page, limit, userId });
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      const data = await EventService.getEventById(id, userId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const rsvp = await EventService.registerForEvent(userId, id);
      res.json({
        success: true,
        message: 'Successfully registered for event',
        data: rsvp,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const data = await EventService.getMyRegistrations(userId);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = req.user?.id;
      if (!userId) throw new AppError('Unauthorized', 401);

      const rsvp = await EventService.cancelRegistration(userId, id);
      res.json({
        success: true,
        message: 'Registration cancelled',
        data: rsvp,
      });
    } catch (error) {
      next(error);
    }
  }
}
