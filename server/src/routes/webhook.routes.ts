import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

router.post('/clerk', WebhookController.handleClerkWebhook);

export { router as webhookRoutes };
