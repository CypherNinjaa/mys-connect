import { Request, Response, NextFunction } from 'express';
import { Webhook } from 'svix';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { UserStatus } from '@prisma/client';

export class WebhookController {
  /**
   * POST /api/v1/webhooks/clerk
   * Handle real-time user events from Clerk
   */
  static async handleClerkWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const webhookSecret = config.clerkWebhookSecret;

      if (!webhookSecret) {
        logger.warn('Clerk Webhook secret not configured. Skipping Svix signature verification.');
      } else {
        const payload = JSON.stringify(req.body);
        const headers = req.headers;
        const svix_id = headers['svix-id'] as string;
        const svix_timestamp = headers['svix-timestamp'] as string;
        const svix_signature = headers['svix-signature'] as string;

        if (svix_id && svix_timestamp && svix_signature) {
          const wh = new Webhook(webhookSecret);
          wh.verify(payload, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
          });
        }
      }

      const { type, data } = req.body;
      logger.info(`🔔 Clerk Webhook event received: ${type}`);

      switch (type) {
        case 'user.created': {
          const clerkId = data.id;
          const email = data.email_addresses?.[0]?.email_address || `${clerkId}@user.clerk`;
          const phone = data.phone_numbers?.[0]?.phone_number || null;
          const firstName = data.first_name || '';
          const lastName = data.last_name || '';

          await prisma.user.upsert({
            where: { clerkId },
            update: { email, phone },
            create: {
              clerkId,
              email,
              phone,
              status: UserStatus.PENDING,
              profile: {
                create: {
                  firstName,
                  lastName,
                  displayName: `${firstName} ${lastName}`.trim(),
                },
              },
            },
          });
          logger.info(`Synced new Clerk user to DB: ${clerkId}`);
          break;
        }

        case 'user.updated': {
          const clerkId = data.id;
          const email = data.email_addresses?.[0]?.email_address;
          const phone = data.phone_numbers?.[0]?.phone_number;

          await prisma.user.update({
            where: { clerkId },
            data: {
              ...(email && { email }),
              ...(phone && { phone }),
            },
          });
          break;
        }

        case 'user.deleted': {
          const clerkId = data.id;
          await prisma.user.delete({ where: { clerkId } }).catch(() => {});
          logger.info(`Deleted user from DB: ${clerkId}`);
          break;
        }

        default:
          logger.debug(`Unhandled webhook event type: ${type}`);
      }

      res.json({ success: true, received: true });
    } catch (error) {
      logger.error('Error handling Clerk Webhook:', error);
      next(error);
    }
  }
}
