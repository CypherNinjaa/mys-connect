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

/**
 * Create a user in Clerk without requiring a password (passwordless / invitation flow)
 */
export async function createClerkUserWithoutPassword(params: {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}) {
  try {
    logger.info(`Creating passwordless Clerk account for ${params.email}`);
    const user = await clerkClient.users.createUser({
      emailAddress: [params.email],
      firstName: params.firstName,
      lastName: params.lastName,
      skipPasswordRequirement: true,
      publicMetadata: {
        role: params.role || 'MEMBER',
        status: 'ACTIVE',
        approved: true,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`Clerk createUser failed for ${params.email}:`, error);

    // If user already exists in Clerk, retrieve existing account and sync metadata
    try {
      const existingClerkUsers = await clerkClient.users.getUserList({
        emailAddress: [params.email],
      });

      if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
        const existingClerkUser = existingClerkUsers.data[0];
        logger.info(`Found existing Clerk account ${existingClerkUser.id} for ${params.email}, updating metadata.`);
        await updateClerkUserMetadata(existingClerkUser.id, {
          role: params.role || 'MEMBER',
          status: 'ACTIVE',
          approved: true,
        });
        return existingClerkUser;
      }
    } catch (lookupErr) {
      logger.error(`Failed to lookup existing Clerk user for ${params.email}:`, lookupErr);
    }

    // Fallback: Send email invitation via Clerk
    try {
      logger.info(`Sending Clerk invitation for ${params.email}`);
      const invitation = await clerkClient.invitations.createInvitation({
        emailAddress: params.email,
        publicMetadata: {
          role: params.role || 'MEMBER',
          status: 'ACTIVE',
        },
      });
      return { id: `inv_${invitation.id}`, emailAddress: params.email };
    } catch (invErr: any) {
      logger.error(`Clerk invitation fallback failed for ${params.email}:`, invErr);
      throw new Error(error.message || 'Failed to create user or invitation in Clerk');
    }
  }
}
