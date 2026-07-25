import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Middleware to verify Clerk authentication.
 * Clerk's Express SDK middleware attaches `req.auth` after verification.
 * This middleware checks if the user is authenticated.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // @ts-expect-error - Clerk middleware will attach auth object
  const auth = req.auth;

  if (!auth?.userId) {
    throw new AppError('Unauthorized. Please sign in.', 401);
  }

  logger.debug(`Authenticated user: ${auth.userId}`);
  next();
};

/**
 * Optional auth — does not throw if unauthenticated.
 * Used for guest-accessible routes that show different content for members.
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Simply pass through — Clerk middleware will still attach auth if present
  next();
};
