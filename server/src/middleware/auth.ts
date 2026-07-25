import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { AppError } from './errorHandler';

/**
 * Middleware to verify Clerk authentication.
 * Uses `@clerk/express` getAuth(req) helper.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    throw new AppError('Unauthorized. Please sign in.', 401);
  }

  next();
};

/**
 * Optional auth — does not throw if unauthenticated.
 */
export const optionalAuth = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next();
};
