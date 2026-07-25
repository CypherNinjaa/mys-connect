import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { UserService } from '../services/user.service';
import { uploadToCloudinary } from '../utils/cloudinary';

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get current authenticated user profile & approval status
   */
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const clerkId = auth?.userId;
      // @ts-expect-error - Attached by userResolver
      const user = req.user;

      if (!user && clerkId) {
        // Auto-sync user if not in DB yet
        const email = (auth?.sessionClaims as any)?.email || clerkId;
        const syncedUser = await UserService.syncUserFromClerk(clerkId, email);
        return res.json({
          success: true,
          data: syncedUser,
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/register
   * Complete member profile registration
   */
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-expect-error - Attached by userResolver
      const userId = req.user?.id;
      const result = await UserService.completeRegistration(userId, req.body);
      res.json({
        success: true,
        message: 'Profile submitted successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/avatar
   * Upload profile avatar image to Cloudinary
   */
  static async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-expect-error - Attached by userResolver
      const userId = req.user?.id;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'Image file is required.' },
        });
      }

      const avatarUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/avatars');
      const profile = await UserService.updateAvatar(userId, avatarUrl);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully.',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/cities
   * List active cities for location dropdowns
   */
  static async getCities(_req: Request, res: Response, next: NextFunction) {
    try {
      const cities = await UserService.getCities();
      res.json({
        success: true,
        data: cities,
      });
    } catch (error) {
      next(error);
    }
  }
}
