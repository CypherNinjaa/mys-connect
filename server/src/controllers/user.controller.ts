import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { UserService } from '../services/user.service';
import { uploadToCloudinary } from '../utils/cloudinary';
import { AppError } from '../middleware/errorHandler';
import { BloodGroup, Gender } from '@prisma/client';
import { z } from 'zod';

const optionalText = z.string().trim().max(500).optional();

const registrationSchema = z.object({
  firstName: z.string().trim().min(2).max(100).regex(/^[\p{L} ]+$/u),
  lastName: z.string().trim().min(2).max(100).regex(/^[\p{L} ]+$/u),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => /^[6-9]\d{9}$/.test(value), 'Enter a valid 10-digit Indian mobile number')
    .optional(),
  dateOfBirth: z.string().date().optional(),
  gender: z.nativeEnum(Gender).optional(),
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
  address: optionalText,
  cityId: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  pinCode: z.string().trim().regex(/^\d{6}$/).optional(),
  occupation: z.string().trim().max(100).optional(),
  organization: z.string().trim().max(200).optional(),
  designation: z.string().trim().max(100).optional(),
  bio: optionalText,
});

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get current authenticated user profile & approval status
   */
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = getAuth(req);
      const clerkId = auth?.userId;
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
      const parsedProfile = registrationSchema.safeParse(req.body);
      if (!parsedProfile.success) {
        throw new AppError(
          parsedProfile.error.issues[0]?.message || 'Invalid profile information.',
          422,
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User account not found.', 401);
      }

      const result = await UserService.completeRegistration(userId, parsedProfile.data);
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
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User account not found.', 401);
      }
      const base64Data = req.body?.base64 || req.body?.image;

      let avatarUrl: string;
      if (base64Data) {
        avatarUrl = await uploadToCloudinary(base64Data, 'mys-connect/avatars');
      } else if (req.file) {
        avatarUrl = await uploadToCloudinary(req.file.buffer, 'mys-connect/avatars');
      } else {
        return res.status(400).json({
          success: false,
          error: { message: 'Image file or base64 data is required.' },
        });
      }

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
