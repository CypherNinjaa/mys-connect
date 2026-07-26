import { Router } from 'express';
import { GalleryController } from '../controllers/gallery.controller';
import { requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';

const router = Router();

router.use(requireAuth);
router.use(userResolver);

router.get('/albums', GalleryController.getAlbums);
router.get('/albums/:id', GalleryController.getAlbumById);

export { router as galleryRoutes };
