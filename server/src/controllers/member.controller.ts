import { Request, Response, NextFunction } from 'express';
import { MemberService } from '../services/member.service';
import { AppError } from '../middleware/errorHandler';

export class MemberController {
  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;
      const cityId = req.query.cityId ? String(req.query.cityId) : undefined;
      const cityName = req.query.cityName ? String(req.query.cityName) : undefined;

      const result = await MemberService.getMembers({ page, limit, search, cityId, cityName });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMemberById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const member = await MemberService.getMemberById(id);
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
}
