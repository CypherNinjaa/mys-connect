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
   * GET /api/v1/admin/events/kpis
   * Get Event KPIs for Dashboard Cards
   */
  static async getEventKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const kpis = await AdminService.getEventKPIs();
      res.json({ success: true, data: kpis });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/events/:id/duplicate
   * Duplicate an event
   */
  static async duplicateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.duplicateEvent(id, adminUserId);

      res.status(201).json({
        success: true,
        message: 'Event duplicated successfully',
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
      const { page, limit, status, chapter, category, search } = req.query;
      const result = await AdminService.listEvents({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as EventStatus | undefined,
        chapter: chapter as string | undefined,
        category: category as string | undefined,
        search: search as string | undefined,
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
      const data = normalizeEventPayload(req.body);
      const result = await AdminService.createEvent(data, adminUserId);

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
      const data = normalizeEventPayload(req.body);
      const result = await AdminService.updateEvent(id, data, adminUserId);

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
   * PUT /api/v1/admin/events/:id/qr-scan-limit
   * Change the entries-per-ticket for an event, optionally rewriting the
   * quota on tickets that have already been issued.
   */
  static async updateEventQrScanLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const parsed = parseInt(String(req.body?.qrScanLimit), 10);
      if (!Number.isFinite(parsed)) {
        res.status(400).json({
          success: false,
          error: { message: 'qrScanLimit must be a number' },
        });
        return;
      }
      const applyToExisting = req.body?.applyToExisting === true || String(req.body?.applyToExisting) === 'true';
      const result = await AdminService.updateEventQrScanLimit(id, parsed, adminUserId, applyToExisting);

      res.json({
        success: true,
        data: result,
        message: result.ticketsUpdated
          ? `Scan limit updated. ${result.ticketsUpdated} existing ticket(s) rewritten.`
          : 'Scan limit updated for future registrations.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/registrations/:id/scan-limit
   * Adjust the entry quota on a single ticket.
   */
  static async updateRegistrationScanLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const parsed = parseInt(String(req.body?.maxScans), 10);
      if (!Number.isFinite(parsed)) {
        res.status(400).json({
          success: false,
          error: { message: 'maxScans must be a number' },
        });
        return;
      }
      const result = await AdminService.updateRegistrationScanLimit(id, parsed, adminUserId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/registrations/:id/cancel
   */
  static async cancelRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const result = await AdminService.cancelRegistration(id, adminUserId, reason);

      res.json({ success: true, data: result, message: 'Registration cancelled' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/registrations/:id/restore
   */
  static async restoreRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const result = await AdminService.restoreRegistration(id, adminUserId);

      res.json({ success: true, data: result, message: 'Registration restored' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/registrations/:id/check-in
   * Manual gate entry from the console.
   */
  static async checkInRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const result = await AdminService.checkInRegistration(id, adminUserId);

      res.json({ success: true, data: result, message: 'Entry recorded' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/registrations/:id/undo-check-in
   */
  static async undoCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user!.id;
      const result = await AdminService.undoCheckIn(id, adminUserId);

      res.json({ success: true, data: result, message: 'Check-in reversed' });
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
      const payload = normalizeNoticePayload(req.body);

      if (req.file) {
        payload.imageUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/notices');
      }

      const result = await AdminService.createNotice(payload, adminUserId);

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
      const payload = normalizeNoticePayload(req.body);

      if (req.file) {
        payload.imageUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/notices');
      }

      const result = await AdminService.updateNotice(id, payload, adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/notices/kpis
   * Get notice KPI statistics
   */
  static async getNoticeKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getNoticeKPIs();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/notices/:id/broadcast
   * Broadcast a notice to all members via Expo Push Notification
   */
  static async broadcastNotice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.broadcastNotice(id, adminUserId);

      res.json({
        success: true,
        message: 'Notice broadcasted successfully to all active members',
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
      const { page, limit, search, category, isPublished } = req.query;
      const result = await AdminService.listAlbums({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search as string,
        category: category as string,
        isPublished:
          isPublished === undefined || isPublished === '' || isPublished === 'all'
            ? undefined
            : String(isPublished) === 'true',
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
   * GET /api/v1/admin/gallery/albums/:id
   * Get a single album with all its photos
   */
  static async getAlbumById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const result = await AdminService.getAlbumById(id);

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
   * Create a new album — accepts an optional `coverImage` file upload
   */
  static async createAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      const data = normalizeAlbumPayload(req.body);

      if (req.file) {
        data.coverImageUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/albums');
      }

      const result = await AdminService.createAlbum(data, adminUserId);

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
   * Update an album — accepts an optional `coverImage` file upload
   */
  static async updateAlbum(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const data = normalizeAlbumPayload(req.body);

      if (req.file) {
        data.coverImageUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/albums');
      }

      const result = await AdminService.updateAlbum(id, data, adminUserId);

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
      const files = (req.files as Express.Multer.File[]) || [];
      const adminUserId = req.user?.id || 'admin';

      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'No photos were uploaded' });
        return;
      }

      const uploadedPhotos: { imageUrl: string; caption?: string }[] = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file.buffer, 'mys-connect/gallery');
        uploadedPhotos.push({ imageUrl: url });
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
   * PATCH /api/v1/admin/gallery/photos/:id
   * Update a photo's caption
   */
  static async updatePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const caption = req.body?.caption;
      const result = await AdminService.updatePhoto(
        id,
        { caption: caption === undefined ? undefined : caption || null },
        adminUserId,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/gallery/albums/:id/photos/reorder
   * Persist a new photo order — body must list every photo id in the album
   */
  static async reorderAlbumPhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const photoIds = req.body?.photoIds;

      if (!Array.isArray(photoIds)) {
        res.status(400).json({ success: false, message: 'photoIds must be an array' });
        return;
      }

      const result = await AdminService.reorderAlbumPhotos(albumId, photoIds.map(String), adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/gallery/albums/:id/cover
   * Promote one of the album's photos to be its cover
   */
  static async setAlbumCover(req: Request, res: Response, next: NextFunction) {
    try {
      const albumId = String(req.params.id);
      const adminUserId = req.user?.id || 'admin';
      const photoId = req.body?.photoId;

      if (!photoId) {
        res.status(400).json({ success: false, message: 'photoId is required' });
        return;
      }

      const result = await AdminService.setAlbumCover(albumId, String(photoId), adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/gallery/photos/bulk-delete
   * Delete several photos in one call
   */
  static async deletePhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id || 'admin';
      const photoIds = req.body?.photoIds;

      if (!Array.isArray(photoIds)) {
        res.status(400).json({ success: false, message: 'photoIds must be an array' });
        return;
      }

      const result = await AdminService.deletePhotos(photoIds.map(String), adminUserId);

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
      const { page, limit, entity, userId, action, search, startDate, endDate } = req.query;
      const result = await AdminService.listAuditLogs({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        entity: entity as string,
        userId: userId as string,
        action: action as string,
        search: search as string,
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
      const adminUserId = req.user?.id || 'admin';
      const result = await AdminService.updateSettings(normalizeSettingsPayload(req.body), adminUserId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

/** A ticket must be scannable at least once; the ceiling is a typo guard. */
const QR_SCAN_LIMIT_MIN = 1;
const QR_SCAN_LIMIT_MAX = 100;

function normalizeEventPayload(body: any) {
  const data = { ...body };
  if (data.startDate && typeof data.startDate === 'string') data.startDate = new Date(data.startDate);
  if (data.endDate && typeof data.endDate === 'string') data.endDate = new Date(data.endDate);
  if (data.registrationDeadline && typeof data.registrationDeadline === 'string') {
    data.registrationDeadline = new Date(data.registrationDeadline);
  }

  if ('isPublic' in data) data.isPublic = String(data.isPublic) === 'true';
  if ('isPublished' in data) data.isPublished = String(data.isPublished) === 'true';
  if ('isOnline' in data) data.isOnline = String(data.isOnline) === 'true';
  if ('isAllDay' in data) data.isAllDay = String(data.isAllDay) === 'true';
  if ('allowWaitlist' in data) data.allowWaitlist = String(data.allowWaitlist) === 'true';
  if ('registrationOpen' in data) data.registrationOpen = String(data.registrationOpen) === 'true';

  if (data.maxAttendees !== undefined && data.maxAttendees !== null && data.maxAttendees !== '') {
    data.maxAttendees = parseInt(String(data.maxAttendees), 10);
  }
  // How many times one ticket may be scanned at the gate. Arrives as a string
  // from the multipart form; drop it rather than forward NaN when it is junk.
  if ('qrScanLimit' in data) {
    const parsed = parseInt(String(data.qrScanLimit), 10);
    if (Number.isFinite(parsed)) {
      data.qrScanLimit = Math.min(Math.max(parsed, QR_SCAN_LIMIT_MIN), QR_SCAN_LIMIT_MAX);
    } else {
      delete data.qrScanLimit;
    }
  }
  if (data.latitude !== undefined && data.latitude !== null && data.latitude !== '') {
    data.latitude = parseFloat(String(data.latitude));
  }
  if (data.longitude !== undefined && data.longitude !== null && data.longitude !== '') {
    data.longitude = parseFloat(String(data.longitude));
  }

  return data;
}

/**
 * Accept either the canonical array form
 *   { settings: [{ key, value, type?, group? }] }
 * or a flat map form
 *   { settings: { 'app.name': 'MYS' } }
 * so older clients keep working.
 */
function normalizeSettingsPayload(body: any): { key: string; value: string; type?: string; group?: string }[] {
  const settings = body?.settings ?? body;

  if (Array.isArray(settings)) {
    return settings.map((s) => ({
      key: String(s?.key ?? ''),
      value: s?.value === undefined || s?.value === null ? '' : String(s.value),
      type: s?.type ? String(s.type) : undefined,
      group: s?.group ? String(s.group) : undefined,
    }));
  }

  if (settings && typeof settings === 'object') {
    return Object.entries(settings).map(([key, value]) => ({
      key,
      value: value === undefined || value === null ? '' : String(value),
    }));
  }

  return [];
}

function normalizeAlbumPayload(body: any) {  const data = { ...(body || {}) };

  if ('isPublished' in data) data.isPublished = String(data.isPublished) === 'true';
  if (data.sortOrder !== undefined && data.sortOrder !== null && data.sortOrder !== '') {
    data.sortOrder = parseInt(String(data.sortOrder), 10);
  } else {
    delete data.sortOrder;
  }

  // Multipart sends empty strings for untouched fields. For the cover URL an
  // explicit empty string means "clear it"; for category it means "leave alone".
  if (data.coverImageUrl === '') data.coverImageUrl = null;
  if (data.category === '') delete data.category;

  return data;
}

function normalizeNoticePayload(body: any) {
  const data = { ...body };

  if (data.publishedAt && typeof data.publishedAt === 'string') data.publishedAt = new Date(data.publishedAt);
  if (data.expiresAt && typeof data.expiresAt === 'string') {
    data.expiresAt = data.expiresAt === '' ? null : new Date(data.expiresAt);
  }

  if ('isPinned' in data) data.isPinned = String(data.isPinned) === 'true';
  if ('isPublished' in data) data.isPublished = String(data.isPublished) === 'true';

  // Multipart sends empty strings for untouched optional fields.
  // For URL fields an empty string means "clear it", so map to null.
  for (const key of ['imageUrl', 'attachmentUrl']) {
    if (data[key] === '') data[key] = null;
  }
  for (const key of ['priority', 'expiresAt']) {
    if (data[key] === '') delete data[key];
  }

  return data;
}
