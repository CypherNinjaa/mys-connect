import { Request, Response, NextFunction } from 'express';
import { TestimonyService } from '../services/testimony.service';
import { getIO } from '../socket/io';
import { SOCKET_EVENTS } from '../socket/events';

export class TestimonyController {
  /**
   * GET /api/v1/testimonies
   * Public / Member list of published testimonies
   */
  static async listPublished(req: Request, res: Response, next: NextFunction) {
    try {
      const testimonies = await TestimonyService.listPublishedTestimonies();
      res.json({
        success: true,
        data: testimonies,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/testimonies
   * Admin list all testimonies
   */
  static async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const testimonies = await TestimonyService.listAllTestimonies(search);
      res.json({
        success: true,
        data: testimonies,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/testimonies/:id
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const testimony = await TestimonyService.getTestimonyById(String(req.params.id));
      res.json({
        success: true,
        data: testimony,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/testimonies
   * Create new testimony
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id;
      const file = req.file;

      const testimony = await TestimonyService.createTestimony(
        {
          authorName: req.body.authorName,
          designation: req.body.designation,
          content: req.body.content,
          imageUrl: req.body.imageUrl,
          sortOrder: req.body.sortOrder ? Number(req.body.sortOrder) : undefined,
          isPublished: req.body.isPublished !== undefined ? String(req.body.isPublished) === 'true' || req.body.isPublished === true : true,
        },
        file,
        adminUserId
      );

      // Socket notification broadcast
      const io = getIO();
      if (io) {
        io.emit(SOCKET_EVENTS.TESTIMONY_UPDATED, { action: 'created', id: testimony.id, at: new Date().toISOString() });
      }

      res.status(201).json({
        success: true,
        message: 'Testimony created successfully',
        data: testimony,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/testimonies/:id
   * Update testimony
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id;
      const file = req.file;

      const testimony = await TestimonyService.updateTestimony(
        id,
        {
          ...(req.body.authorName !== undefined && { authorName: req.body.authorName }),
          ...(req.body.designation !== undefined && { designation: req.body.designation }),
          ...(req.body.content !== undefined && { content: req.body.content }),
          ...(req.body.imageUrl !== undefined && { imageUrl: req.body.imageUrl }),
          ...(req.body.sortOrder !== undefined && { sortOrder: Number(req.body.sortOrder) }),
          ...(req.body.isPublished !== undefined && { isPublished: String(req.body.isPublished) === 'true' || req.body.isPublished === true }),
        },
        file,
        adminUserId
      );

      const io = getIO();
      if (io) {
        io.emit(SOCKET_EVENTS.TESTIMONY_UPDATED, { action: 'updated', id: testimony.id, at: new Date().toISOString() });
      }

      res.json({
        success: true,
        message: 'Testimony updated successfully',
        data: testimony,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/testimonies/:id
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const adminUserId = req.user?.id;

      const result = await TestimonyService.deleteTestimony(id, adminUserId);

      const io = getIO();
      if (io) {
        io.emit(SOCKET_EVENTS.TESTIMONY_UPDATED, { action: 'deleted', id, at: new Date().toISOString() });
      }

      res.json({
        success: true,
        message: 'Testimony deleted successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/testimonies/reorder
   */
  static async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ success: false, message: 'Invalid payload: ids must be an array of testimony IDs' });
        return;
      }

      const adminUserId = req.user?.id;
      const result = await TestimonyService.reorderTestimonies(ids, adminUserId);

      const io = getIO();
      if (io) {
        io.emit(SOCKET_EVENTS.TESTIMONY_UPDATED, { action: 'reordered', at: new Date().toISOString() });
      }

      res.json({
        success: true,
        message: 'Testimonies reordered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
