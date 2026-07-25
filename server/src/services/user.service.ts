import { prisma } from '../utils/prisma';
import { UserStatus, Gender, BloodGroup } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface RegisterProfileInput {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  cityId?: string;
  state?: string;
  pinCode?: string;
  occupation?: string;
  organization?: string;
  designation?: string;
  fatherName?: string;
  gotra?: string;
  nativePlace?: string;
  bio?: string;
}

export class UserService {
  /**
   * Find user by Clerk ID with full profile & city relations
   */
  static async getUserByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        profile: {
          include: {
            city: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Sync user record from Clerk webhook or lazy login
   */
  static async syncUserFromClerk(clerkId: string, email: string, phone?: string) {
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          phone,
          status: UserStatus.PENDING,
        },
        include: { profile: true },
      });
    }

    return user;
  }

  /**
   * Complete member registration (saves profile data, keeps status PENDING for admin approval)
   */
  static async completeRegistration(userId: string, data: RegisterProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('User account not found', 404);
    }

    if (user.status === UserStatus.DEACTIVATED || user.status === UserStatus.REJECTED) {
      throw new AppError('Your account has been deactivated or rejected by administration.', 403);
    }

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address,
        cityId: data.cityId,
        state: data.state || 'Jharkhand',
        pinCode: data.pinCode,
        occupation: data.occupation,
        organization: data.organization,
        designation: data.designation,
        fatherName: data.fatherName,
        gotra: data.gotra,
        nativePlace: data.nativePlace,
        bio: data.bio,
      },
      create: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: `${data.firstName} ${data.lastName}`,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address,
        cityId: data.cityId,
        state: data.state || 'Jharkhand',
        pinCode: data.pinCode,
        occupation: data.occupation,
        organization: data.organization,
        designation: data.designation,
        fatherName: data.fatherName,
        gotra: data.gotra,
        nativePlace: data.nativePlace,
        bio: data.bio,
      },
      include: { city: true },
    });

    // Update phone on User if provided
    if (data.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: data.phone },
      });
    }

    return {
      user: await this.getUserByClerkId(user.clerkId),
      profile,
    };
  }

  /**
   * Update profile photo URL (Cloudinary)
   */
  static async updateAvatar(userId: string, avatarUrl: string) {
    const profile = await prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
    });
    return profile;
  }

  /**
   * Get active cities for dropdown selects
   */
  static async getCities() {
    return prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
