import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { UserStatus, UserRole } from '@prisma/client';
import { clerkClient } from '../utils/clerk';
import { logger } from '../utils/logger';

export const userResolver = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const auth = getAuth(req);
    const clerkId = auth?.userId;

    if (!clerkId) {
      return next();
    }

    // Extract claims from token or fetch Clerk User metadata
    const claims = auth?.sessionClaims as any;
    let clerkEmail: string | undefined = claims?.email || claims?.email_address;
    let clerkRole: string | undefined = claims?.public_metadata?.role || claims?.role;
    let clerkStatus: string | undefined = claims?.public_metadata?.status || claims?.status;

    // Fallback: If role/email missing from token claims, fetch from Clerk SDK
    if (!clerkEmail || !clerkRole) {
      try {
        const clerkUser = await clerkClient.users.getUser(clerkId);
        clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress || clerkEmail;
        clerkRole = (clerkUser.publicMetadata?.role as string) || clerkRole;
        clerkStatus = (clerkUser.publicMetadata?.status as string) || clerkStatus;
      } catch (clerkErr) {
        logger.warn(`Failed to fetch Clerk user details for ${clerkId}:`, clerkErr);
      }
    }

    // 1. First, search by clerkId
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        profile: {
          include: { city: true },
        },
      },
    });

    // 2. If not found by clerkId, search by email to re-link seeded or legacy accounts
    if (!user && clerkEmail) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: clerkEmail },
        include: {
          profile: {
            include: { city: true },
          },
        },
      });

      if (userByEmail) {
        logger.info(`Re-linking clerkId ${clerkId} to existing database user ${userByEmail.email}`);
        user = await prisma.user.update({
          where: { id: userByEmail.id },
          data: { clerkId },
          include: {
            profile: {
              include: { city: true },
            },
          },
        });
      }
    }

    // 3. If still no user in DB, create new DB user
    if (!user) {
      const primaryEmail = clerkEmail || `${clerkId}@user.clerk`;
      const initialRole =
        clerkRole && Object.values(UserRole).includes(clerkRole as UserRole)
          ? (clerkRole as UserRole)
          : UserRole.MEMBER;
      const initialStatus = clerkStatus === 'ACTIVE' ? UserStatus.ACTIVE : UserStatus.PENDING;

      logger.info(`Auto-creating database user for ${clerkId} with role ${initialRole}`);
      user = await prisma.user.create({
        data: {
          clerkId,
          email: primaryEmail,
          role: initialRole,
          status: initialStatus,
        },
        include: {
          profile: {
            include: { city: true },
          },
        },
      });
    }

    // 4. Role & Status Sync:
    // If Clerk publicMetadata defines a role (e.g. SUPER_ADMIN) that differs from DB, sync DB to match Clerk!
    if (clerkRole && Object.values(UserRole).includes(clerkRole as UserRole) && user.role !== clerkRole) {
      logger.info(`Syncing user role for ${user.email} from DB (${user.role}) to Clerk (${clerkRole})`);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: clerkRole as UserRole,
          status: clerkStatus === 'ACTIVE' ? UserStatus.ACTIVE : user.status,
        },
        include: {
          profile: {
            include: { city: true },
          },
        },
      });
    }

    // Reject banned/deactivated/rejected users
    if (user.status === UserStatus.DEACTIVATED || user.status === UserStatus.REJECTED) {
      throw new AppError('Your account has been deactivated or rejected by administration.', 403);
    }

    // Attach to Request (typed via src/types/express.d.ts)
    req.user = user;
    req.userRole = user.role;
    req.userStatus = user.status;

    next();
  } catch (error) {
    next(error);
  }
};