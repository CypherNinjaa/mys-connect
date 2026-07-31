import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { userResolver } from '../middleware/userResolver';

const router = Router();

router.get('/', optionalAuth, userResolver, EventController.getEvents);

// Declared before '/:id' — otherwise the param route claims 'my-registrations'
// and the handler below is never reached.
router.get('/my-registrations', requireAuth, userResolver, EventController.getMyRegistrations);

router.get('/:id', optionalAuth, userResolver, EventController.getEventById);

// Protected registration routes
router.post('/:id/register', requireAuth, userResolver, EventController.register);
router.delete('/:id/register', requireAuth, userResolver, EventController.cancelRegistration);

export { router as eventRoutes };
