import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { UserStatus, UserRole, EventStatus, NoticeType } from '@prisma/client';
import { uploadToCloudinary } from '../utils/cloudinary';

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
        data: result,
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

  /**
   * POST /api/v1/admin/users
   * Create user directly from Admin
   */
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.createUser(req.body, adminUserId);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/members/statistics
   */
  static async getMemberStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getMemberStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/members/:id
   */
  static async getMemberById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.getMemberById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/members/bulk-status
   */
  static async bulkUpdateMemberStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { userIds, status, reason } = req.body;
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.bulkUpdateMemberStatus(userIds, status as UserStatus, adminUserId, reason);
      res.json({ success: true, message: `Updated status for ${result.count} members`, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/members/bulk-role
   */
  static async bulkUpdateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { userIds, role } = req.body;
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.bulkUpdateMemberRole(userIds, role as UserRole, adminUserId);
      res.json({ success: true, message: `Updated role for ${result.count} members`, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/dashboard
   * Get dashboard statistics
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getDashboardStats();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/events
   * List events with pagination and filters
   */
  static async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await AdminService.listEvents({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as EventStatus | undefined,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/events
   * Create a new event
   */
  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      if (req.file) {
        const url = await uploadToCloudinary(req.file.buffer, 'mys-connect/events');
        req.body.coverImageUrl = url;
      }
      if (req.body.startDate && typeof req.body.startDate === 'string') {
        req.body.startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate && typeof req.body.endDate === 'string') {
        req.body.endDate = new Date(req.body.endDate);
      }
      if (req.body.maxAttendees) {
        req.body.maxAttendees = parseInt(String(req.body.maxAttendees), 10);
      }
      const result = await AdminService.createEvent(req.body, adminUserId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/events/:id
   * Update an event
   */
  static async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      if (req.file) {
        const url = await uploadToCloudinary(req.file.buffer, 'mys-connect/events');
        req.body.coverImageUrl = url;
      }
      if (req.body.startDate && typeof req.body.startDate === 'string') {
        req.body.startDate = new Date(req.body.startDate);
      }
      if (req.body.endDate && typeof req.body.endDate === 'string') {
        req.body.endDate = new Date(req.body.endDate);
      }
      if (req.body.maxAttendees) {
        req.body.maxAttendees = parseInt(String(req.body.maxAttendees), 10);
      }
      const result = await AdminService.updateEvent(id, req.body, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/events/:id/publish
   * Publish an event
   */
  static async publishEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.publishEvent(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/events/:id/unpublish
   * Unpublish an event
   */
  static async unpublishEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.unpublishEvent(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/events/:id/cancel
   * Cancel an event
   */
  static async cancelEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.cancelEvent(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/events/:id
   * Delete an event
   */
  static async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.deleteEvent(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/events/:id/registrations
   * Get registrations for an event
   */
  static async getEventRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.getEventRegistrations(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/notices
   * List notices with pagination and filters
   */
  static async listNotices(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, type, search } = req.query;
      const result = await AdminService.listNotices({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        type: type as NoticeType | undefined,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/notices
   * Create a new notice
   */
  static async createNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.createNotice(req.body, adminUserId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/notices/:id
   * Update a notice
   */
  static async updateNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.updateNotice(id, req.body, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/notices/:id/publish
   * Publish a notice
   */
  static async publishNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.publishNotice(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/notices/:id/unpublish
   * Unpublish a notice
   */
  static async unpublishNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.unpublishNotice(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/notices/:id
   * Delete a notice
   */
  static async deleteNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.deleteNotice(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/albums
   * List albums with pagination and filters
   */
  static async listAlbums(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      const result = await AdminService.listAlbums({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/albums
   * Create a new album
   */
  static async createAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.createAlbum(req.body, adminUserId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/albums/:id
   * Update an album
   */
  static async updateAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.updateAlbum(id, req.body, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/albums/:id
   * Delete an album
   */
  static async deleteAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.deleteAlbum(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/albums/:albumId/photos
   * Upload photos to an album
   */
  static async uploadPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = String(req.params.albumId || req.params.id);
      const files = req.files as Express.Multer.File[];
      const adminUserId = req.user?.id || 'admin';

      const uploadedPhotos: { imageUrl: string; sortOrder: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i].buffer, 'mys-connect/gallery');
        uploadedPhotos.push({ imageUrl: url, sortOrder: i });
      }

      const result = await AdminService.addPhotosToAlbum(albumId, uploadedPhotos, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/photos/:id
   * Delete a photo
   */
  static async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.deletePhoto(id, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   * List audit logs with pagination and filters
   */
  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, entity, userId, startDate, endDate } = req.query;
      const result = await AdminService.listAuditLogs({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        entity: entity as string,
        userId: userId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/settings
   * Get application settings
   */
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getSettings();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/settings
   * Update application settings
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body;
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.updateSettings(settings, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
