import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { UserStatus, UserRole } from '@prisma/client';

export class AdminController {
  /**
   * GET /api/v1/admin/users
   * List users with pagination and status filters
   */
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, role, search, cityId } = req.query;
      const result = await AdminService.listUsers({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as UserStatus,
        role: role as UserRole,
        search: search as string,
        cityId: cityId as string,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/users/:id/status
   * Change user status (Approve ACTIVE, Reject REJECTED, Ban/Deactivate DEACTIVATED, Unban ACTIVE)
   */
  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, reason } = req.body;
      // @ts-expect-error - Attached by userResolver
      const adminUserId = req.user?.id || 'admin';

      const updatedUser = await AdminService.updateUserStatus(
        id,
        status as UserStatus,
        adminUserId,
        typeof reason === 'string' ? reason : undefined,
      );

      res.json({
        success: true,
        message: `User status updated to ${status} successfully.`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/users/:id/role
   * Update user role (MEMBER, MODERATOR, ADMIN)
   */
  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { role } = req.body;
      // @ts-expect-error - Attached by userResolver
      const adminUserId = req.user?.id || 'admin';

      const updatedUser = await AdminService.updateUserRole(id, role as UserRole, adminUserId);

      res.json({
        success: true,
        message: `User role updated to ${role} successfully.`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}
