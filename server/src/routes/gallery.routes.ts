import { Router } from 'express';
import { GalleryController } from '../controllers/gallery.controller';
import { optionalAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';

const router = Router();

router.get('/', optionalAuth, userResolver, GalleryController.getGallery);
router.get('/albums', optionalAuth, userResolver, GalleryController.getAlbums);
router.get('/search', optionalAuth, userResolver, GalleryController.getGallery);
router.get('/:id', optionalAuth, userResolver, GalleryController.getAlbumById);
router.get('/albums/:id', optionalAuth, userResolver, GalleryController.getAlbumById);

export { router as galleryRoutes };
