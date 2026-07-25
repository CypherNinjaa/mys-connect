import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

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

  // Ensure req.auth is populated
  (req as any).auth = auth;

  logger.debug(`Authenticated user: ${auth.userId}`);
  next();
};

/**
 * Optional auth — does not throw if unauthenticated.
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const auth = getAuth(req);
  if (auth?.userId) {
    (req as any).auth = auth;
  }
  next();
};
