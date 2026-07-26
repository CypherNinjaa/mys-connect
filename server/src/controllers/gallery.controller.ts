import { Request, Response, NextFunction } from 'express';
import { GalleryService } from '../services/gallery.service';

export class GalleryController {
  static async getGallery(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string;
      const search = (req.query.search || req.query.q) as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 30;

      const data = await GalleryService.getGallery({ category, search, page, limit });
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAlbums(req: Request, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string;
      const search = (req.query.search || req.query.q) as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 30;

      const data = await GalleryService.getGallery({ category, search, page, limit });
      res.json({
        success: true,
        data: data.albums || [],
        items: data.items || [],
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAlbumById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const album = await GalleryService.getAlbumById(id);
      res.json({
        success: true,
        data: album,
      });
    } catch (error) {
      next(error);
    }
  }
}
