import { Router } from 'express';
import { TestimonyController } from '../controllers/testimony.controller';

const router = Router();

// Public / member route to fetch published testimonies
router.get('/', TestimonyController.listPublished);

export { router as testimonyRoutes };
