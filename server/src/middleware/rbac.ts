import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EXECUTIVE' | 'VOLUNTEER' | 'MEMBER' | 'GUEST';

/**
 * Role-Based Access Control middleware.
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER requireAuth middleware.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole: Role | undefined = req.userRole;

    if (!userRole) {
      throw new AppError('User role not found. Contact support.', 403);
    }

    if (!allowedRoles.includes(userRole)) {
      throw new AppError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        403,
      );
    }

    next();
  };
};
