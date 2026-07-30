import { prisma } from '../utils/prisma';
import { UserStatus, Gender, BloodGroup } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { registrationRequiresApproval } from '../utils/appSettings';

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
  bio?: string;
}

export class UserService {
  /**
   * Helper to generate unique Member ID format: MYS/XXXXX
   */
  private static async generateMemberId(): Promise<string> {
    const count = await prisma.user.count();
    let num = count + 1;
    let memberId = `MYS/${num.toString().padStart(5, '0')}`;
    
    // Ensure uniqueness
    let existing = await prisma.user.findUnique({ where: { memberId } });
    while (existing) {
      num += 1;
      memberId = `MYS/${num.toString().padStart(5, '0')}`;
      existing = await prisma.user.findUnique({ where: { memberId } });
    }

    return memberId;
  }

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
      const memberId = await this.generateMemberId();
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          phone,
          memberId,
          status: UserStatus.PENDING,
        },
        include: { profile: true },
      });
    }

    return user;
  }

  /**
   * Complete member registration (saves profile data and marks user profile complete)
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

    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: fullName,
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
        bio: data.bio,
      },
      create: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: fullName,
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
        bio: data.bio,
      },
      include: { city: true },
    });

    let memberId = user.memberId;
    if (!memberId) {
      memberId = await this.generateMemberId();
    }

    // Update User model fields
    // When admin approval is switched off, a completed profile is enough to
    // activate the account outright — otherwise the member stays PENDING and
    // sits on the waiting screen until an admin approves them.
    const requiresApproval = await registrationRequiresApproval();
    const activateNow = !requiresApproval && user.status === UserStatus.PENDING;

    await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        memberId,
        profileComplete: true,
        ...(activateNow ? { status: UserStatus.ACTIVE } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
      },
    });

    return {
      user: await this.getUserByClerkId(user.clerkId),
      profile,
      requiresApproval,
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

    await prisma.user.update({
      where: { id: userId },
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
