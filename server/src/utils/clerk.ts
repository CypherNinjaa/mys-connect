import { createClerkClient } from '@clerk/express';
import { config } from '../config';
import { logger } from './logger';

// Initialize Clerk Backend SDK Client
export const clerkClient = createClerkClient({
  secretKey: config.clerkSecretKey,
});

/**
 * Ban a user in Clerk identity provider
 */
export async function banClerkUser(clerkUserId: string): Promise<boolean> {
  try {
    logger.info(`🚫 Banning Clerk user: ${clerkUserId}`);
    await clerkClient.users.banUser(clerkUserId);
    return true;
  } catch (error: any) {
    logger.error(`Failed to ban Clerk user ${clerkUserId}:`, error);
    throw new Error(error.message || 'Failed to ban user in Clerk');
  }
}

/**
 * Unban a user in Clerk identity provider
 */
export async function unbanClerkUser(clerkUserId: string): Promise<boolean> {
  try {
    logger.info(`✅ Unbanning Clerk user: ${clerkUserId}`);
    await clerkClient.users.unbanUser(clerkUserId);
    return true;
  } catch (error: any) {
    logger.error(`Failed to unban Clerk user ${clerkUserId}:`, error);
    throw new Error(error.message || 'Failed to unban user in Clerk');
  }
}

/**
 * Update user metadata in Clerk
 */
export async function updateClerkUserMetadata(
  clerkUserId: string,
  publicMetadata: Record<string, any>,
) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: {
        ...user.publicMetadata,
        ...publicMetadata,
      },
    });
  } catch (error: any) {
    logger.error(`Failed to update Clerk metadata for ${clerkUserId}:`, error);
  }
}
