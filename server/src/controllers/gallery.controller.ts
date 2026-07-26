import { Request, Response, NextFunction } from 'express';
import { GalleryService } from '../services/gallery.service';

export class GalleryController {
  static async getAlbums(_req: Request, res: Response, next: NextFunction) {
    try {
      const albums = await GalleryService.getAlbums();
      res.json({
        success: true,
        data: albums,
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
