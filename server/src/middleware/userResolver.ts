import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { UserStatus } from '@prisma/client';

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

    // Lookup user in DB with Profile
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        profile: {
          include: { city: true },
        },
      },
    });

    // Auto-create user if missing in DB
    if (!user) {
      const primaryEmail = (auth?.sessionClaims as any)?.email || `${clerkId}@user.clerk`;
      user = await prisma.user.create({
        data: {
          clerkId,
          email: primaryEmail,
          status: UserStatus.PENDING,
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