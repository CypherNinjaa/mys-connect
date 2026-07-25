import { prisma } from '../utils/prisma';
import { UserStatus, UserRole } from '@prisma/client';
import { banClerkUser, unbanClerkUser, updateClerkUserMetadata } from '../utils/clerk';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  cityId?: string;
}

export class AdminService {
  /**
   * List users with pagination and search filters
   */
  static async listUsers(query: ListUsersQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.cityId) {
      where.profile = { cityId: query.cityId };
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        { profile: { gotra: { contains: search, mode: 'insensitive' } } },
        { profile: { occupation: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            include: { city: true },
          },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user status (Approve, Reject, Ban / Deactivate, Unban / Activate)
   * Integrates directly with Clerk banUser / unbanUser API.
   */
  static async updateUserStatus(
    targetUserId: string,
    newStatus: UserStatus,
    adminUserId: string,
    reasonNote?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const previousStatus = user.status;
    logger.info(`Admin ${adminUserId} changing user ${targetUserId} status from ${previousStatus} -> ${newStatus}`);

    // Update in Prisma Database
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { status: newStatus },
      include: { profile: { include: { city: true } } },
    });

    // Sync with Clerk ban/unban feature
    if (newStatus === UserStatus.DEACTIVATED || newStatus === UserStatus.REJECTED) {
      // Ban user in Clerk
      try {
        await banClerkUser(user.clerkId);
        await updateClerkUserMetadata(user.clerkId, { status: newStatus, banned: true });
      } catch (err) {
        logger.error(`Error syncing ban status to Clerk for ${user.clerkId}:`, err);
      }
    } else if (newStatus === UserStatus.ACTIVE) {
      // Unban user in Clerk
      try {
        await unbanClerkUser(user.clerkId);
        await updateClerkUserMetadata(user.clerkId, { status: newStatus, banned: false, approved: true });
      } catch (err) {
        logger.error(`Error syncing unban status to Clerk for ${user.clerkId}:`, err);
      }
    }

    // Log Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `USER_STATUS_CHANGE_${newStatus}`,
        entity: 'User',
        entityId: targetUserId,
        metadata: {
          previousStatus,
          newStatus,
          reasonNote: reasonNote || null,
          targetEmail: user.email,
        },
      },
    });

    return updatedUser;
  }

  /**
   * Update user role (e.g. elevate to ADMIN or MODERATOR)
   */
  static async updateUserRole(targetUserId: string, newRole: UserRole, adminUserId: string) {
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await updateClerkUserMetadata(user.clerkId, { role: newRole });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `USER_ROLE_CHANGE_${newRole}`,
        entity: 'User',
        entityId: targetUserId,
      },
    });

    return user;
  }
}
