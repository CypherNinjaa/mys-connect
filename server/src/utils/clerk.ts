import { createClerkClient } from '@clerk/express';
import { config } from '../config';
import { logger } from './logger';
import { AppError } from '../middleware/errorHandler';

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

    // If user already exists in Clerk, check if existing account can be retrieved
    try {
      const existingClerkUsers = await clerkClient.users.getUserList({
        emailAddress: [params.email],
      });

      if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
        const existingClerkUser = existingClerkUsers.data[0];
        logger.info(`Found existing Clerk account ${existingClerkUser.id} for ${params.email}`);
        return existingClerkUser;
      }
    } catch (lookupErr) {
      logger.error(`Failed to lookup existing Clerk user for ${params.email}:`, lookupErr);
    }

    const clerkErrMsg = error.errors?.[0]?.message || error.message || 'Failed to create user in Clerk';
    throw new AppError(`Clerk Error: ${clerkErrMsg}`, 400);
  }
}

/**
 * Create a Clerk Invitation for a new member
 */
export async function createClerkInvitation(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}) {
  try {
    logger.info(`Sending Clerk invitation email to ${params.email}`);
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: params.email,
      publicMetadata: {
        role: params.role || 'MEMBER',
        firstName: params.firstName || '',
        lastName: params.lastName || '',
      },
    });
    return invitation;
  } catch (error: any) {
    logger.error(`Clerk createInvitation failed for ${params.email}:`, error);
    const clerkErrMsg = error.errors?.[0]?.message || error.message || 'Failed to send Clerk invitation';
    throw new AppError(`Clerk Invitation Error: ${clerkErrMsg}`, 400);
  }
}
