import { prisma } from '../utils/prisma';
import { UserStatus, UserRole, EventStatus, RSVPStatus, NoticeType, NoticePriority, AlbumCategory, Prisma } from '@prisma/client';
import { banClerkUser, unbanClerkUser, updateClerkUserMetadata, createClerkUserWithoutPassword, createClerkInvitation, clerkClient } from '../utils/clerk';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';
import {
  emitDashboardUpdated,
  emitEventCancelled,
  emitEventCreated,
  emitEventDeleted,
  emitEventPublished,
  emitEventUnpublished,
  emitEventUpdated,
  emitGalleryAlbumCreated,
  emitGalleryAlbumDeleted,
  emitGalleryAlbumUpdated,
  emitGalleryPhotosAdded,
  emitGalleryPhotosDeleted,
  emitMemberApproved,
  emitMemberCreated,
  emitMemberRoleChanged,
  emitMemberStatusChanged,
  emitNoticeCreated,
  emitNoticeDeleted,
  emitNoticePublished,
  emitNoticeUnpublished,
  emitNoticeUpdated,
  emitRegistrationCancelled,
  emitRegistrationCheckedIn,
  emitRegistrationUpdated,
} from '../socket/emitters';
import { buildDashboardCounters, buildRegistrationSnapshot } from '../socket/snapshots';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  cityId?: string;
  occupation?: string;
  profileComplete?: boolean;
  hasAvatar?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListEventsQuery {
  page?: number;
  limit?: number;
  status?: EventStatus;
  search?: string;
}

export interface ListNoticesQuery {
  page?: number;
  limit?: number;
  type?: NoticeType;
  search?: string;
}

export interface ListAlbumsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPublished?: boolean;
}

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  entity?: string;
  userId?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class AdminService {
  /**
   * Get member statistics overview KPI cards
   */
  static async getMemberStatistics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, active, pending, suspended, guests, recentlyJoined] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.PENDING } }),
      prisma.user.count({ where: { status: UserStatus.DEACTIVATED } }),
      prisma.user.count({ where: { role: UserRole.GUEST } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totalMembers: total,
      activeMembers: active,
      pendingApprovals: pending,
      suspendedMembers: suspended,
      guestMembers: guests,
      recentlyJoined,
    };
  }

  /**
   * List users with enterprise pagination, sorting, and search filters
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
      where.profile = { ...(where.profile || {}), cityId: query.cityId };
    }

    if (query.occupation) {
      where.profile = { ...(where.profile || {}), occupation: { contains: query.occupation, mode: 'insensitive' } };
    }

    if (typeof query.profileComplete === 'boolean') {
      where.profileComplete = query.profileComplete;
    }

    if (typeof query.hasAvatar === 'boolean') {
      if (query.hasAvatar) {
        where.OR = [
          { avatarUrl: { not: null } },
          { profile: { avatarUrl: { not: null } } },
        ];
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { memberId: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        { profile: { occupation: { contains: search, mode: 'insensitive' } } },
        { profile: { organization: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderByDirection = query.sortOrder || 'desc';

    const orderBy: any = {};
    if (['createdAt', 'updatedAt', 'email', 'role', 'status', 'lastLoginAt'].includes(orderByField)) {
      orderBy[orderByField] = orderByDirection;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          profile: {
            include: { city: true },
          },
          _count: {
            select: { eventRSVPs: true },
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

    // Resolve real Clerk User ID by email if current clerkId is synthetic
    let realClerkId = user.clerkId;
    if (user.email) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [user.email] });
        if (clerkUsers.data && clerkUsers.data.length > 0) {
          realClerkId = clerkUsers.data[0].id;
          logger.info(`Resolved real Clerk User ID ${realClerkId} for member ${user.email}`);
        }
      } catch (clerkErr) {
        logger.warn(`Could not resolve real Clerk User ID for ${user.email}:`, clerkErr);
      }
    }

    // Update status in ALL matching records in Prisma Database (by ID, email, or clerkId)
    const matchingOrs: any[] = [{ id: targetUserId }];
    if (user.email) matchingOrs.push({ email: user.email });
    if (realClerkId) matchingOrs.push({ clerkId: realClerkId });

    await prisma.user.updateMany({
      where: { OR: matchingOrs },
      data: { status: newStatus },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: { include: { city: true } } },
    });

    // Sync with Clerk ban/unban feature
    if (realClerkId) {
      if (newStatus === UserStatus.DEACTIVATED || newStatus === UserStatus.REJECTED) {
        // Ban user in Clerk
        try {
          await banClerkUser(realClerkId);
          await updateClerkUserMetadata(realClerkId, {
            status: newStatus,
            banned: true,
            approved: false,
            reasonNote: reasonNote || undefined,
            statusReason: reasonNote || undefined,
          });
          logger.info(`Banned Clerk user account ${realClerkId} (${user.email}) with reason: ${reasonNote || 'N/A'}`);
        } catch (err) {
          logger.error(`Error syncing ban status to Clerk for ${realClerkId}:`, err);
        }
      } else if (newStatus === UserStatus.ACTIVE) {
        // Unban user in Clerk
        try {
          await unbanClerkUser(realClerkId);
          await updateClerkUserMetadata(realClerkId, {
            status: newStatus,
            banned: false,
            approved: true,
            reasonNote: undefined,
            statusReason: undefined,
          });
          logger.info(`Unbanned Clerk user account ${realClerkId} (${user.email})`);
        } catch (err) {
          logger.error(`Error syncing unban status to Clerk for ${realClerkId}:`, err);
        }
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

    // PENDING -> ACTIVE is an approval, which the clients treat differently from
    // a plain status edit (it is what clears the pending-approvals queue).
    if (updatedUser) {
      const isApproval =
        newStatus === UserStatus.ACTIVE && previousStatus === UserStatus.PENDING;
      if (isApproval) {
        emitMemberApproved(updatedUser, adminUserId);
      } else {
        emitMemberStatusChanged(updatedUser, adminUserId);
      }
      void buildDashboardCounters(['activeMembers', 'pendingApprovals']).then((c) =>
        emitDashboardUpdated(c, adminUserId),
      );
    }

    return updatedUser;
  }

  /**
   * Update user role (SUPER_ADMIN only - resolved at controller level)
   */
  static async updateUserRole(targetUserId: string, newRole: UserRole, adminUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const previousRole = user.role;
    logger.info(`Admin ${adminUserId} changing user ${targetUserId} role from ${previousRole} -> ${newRole}`);

    // Resolve real Clerk User ID by email if current clerkId is synthetic
    let realClerkId = user.clerkId;
    if (user.email) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [user.email] });
        if (clerkUsers.data && clerkUsers.data.length > 0) {
          realClerkId = clerkUsers.data[0].id;
          logger.info(`Resolved real Clerk User ID ${realClerkId} for member ${user.email}`);
        }
      } catch (clerkErr) {
        logger.warn(`Could not resolve real Clerk User ID for ${user.email}:`, clerkErr);
      }
    }

    // Update role in ALL matching database records (by ID, email, or clerkId)
    const matchingOrs: any[] = [{ id: targetUserId }];
    if (user.email) matchingOrs.push({ email: user.email });
    if (realClerkId) matchingOrs.push({ clerkId: realClerkId });

    await prisma.user.updateMany({
      where: { OR: matchingOrs },
      data: { role: newRole },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: { include: { city: true } } },
    });

    // Update Clerk User publicMetadata
    if (realClerkId) {
      try {
        await updateClerkUserMetadata(realClerkId, { role: newRole });
        logger.info(`Successfully updated Clerk publicMetadata role to ${newRole} for ${realClerkId} (${user.email})`);
      } catch (err) {
        logger.error(`Failed to update Clerk publicMetadata role for ${realClerkId}:`, err);
      }
    }

    // Log Audit Trail
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `USER_ROLE_CHANGE_${newRole}`,
        entity: 'User',
        entityId: targetUserId,
        metadata: {
          previousRole,
          newRole,
          targetEmail: user.email,
        },
      },
    });

    if (updatedUser) {
      emitMemberRoleChanged(updatedUser, adminUserId);
    }

    return updatedUser || user;
  }

  /**
   * Create a user directly from Admin panel
   */
  static async createUser(
    data: {
      email: string;
      firstName: string;
      lastName: string;
      role?: UserRole;
      status?: UserStatus;
      phone?: string;
    },
    adminUserId: string,
  ) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingByEmail) {
      throw new AppError(`A member with email address '${data.email}' already exists in the system.`, 400);
    }

    if (data.phone) {
      const existingByPhone = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (existingByPhone) {
        throw new AppError(`A member with phone number '${data.phone}' already exists in the system.`, 400);
      }
    }

    // Provision Clerk Account via Official Email Invitation
    let clerkId: string;
    try {
      const invitation = await createClerkInvitation({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'MEMBER',
      });
      clerkId = invitation.id;
      logger.info(`Successfully dispatched Clerk invitation email (${clerkId}) to ${data.email}`);
    } catch (invErr: any) {
      // If email is already registered in Clerk, lookup existing Clerk user ID
      try {
        const existingClerkUsers = await clerkClient.users.getUserList({
          emailAddress: [data.email],
        });
        if (existingClerkUsers.data && existingClerkUsers.data.length > 0) {
          clerkId = existingClerkUsers.data[0].id;
          logger.info(`Email ${data.email} exists in Clerk under user ID ${clerkId}`);
        } else {
          throw invErr;
        }
      } catch (lookupErr) {
        throw invErr;
      }
    }

    // Verify clerkId is not already bound to another database user
    const existingByClerkId = await prisma.user.findUnique({ where: { clerkId } });
    if (existingByClerkId) {
      throw new AppError(
        `A member account with email address '${data.email}' already exists in the system.`,
        400
      );
    }

    const user = await prisma.user.create({
      data: {
        clerkId,
        email: data.email,
        phone: data.phone,
        role: data.role || UserRole.MEMBER,
        status: data.status || UserStatus.ACTIVE,
        profileComplete: true,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        },
      },
      include: { profile: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      },
    });

    emitMemberCreated(user, adminUserId);
    void buildDashboardCounters(['totalMembers', 'activeMembers', 'pendingApprovals']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return user;
  }

  /**
   * Get detailed member profile by ID with audit log history and event RSVPs
   */
  static async getMemberById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: { city: true },
        },
        eventRSVPs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            event: {
              select: { id: true, title: true, startDate: true, status: true, venue: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Member not found', 404);
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { OR: [{ userId: id }, { entityId: id }] },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Compute profile completion percentage
    let filledFields = 0;
    const totalFields = 10;
    if (user.email) filledFields++;
    if (user.phone) filledFields++;
    if (user.avatarUrl || user.profile?.avatarUrl) filledFields++;
    if (user.profile?.firstName) filledFields++;
    if (user.profile?.lastName) filledFields++;
    if (user.profile?.dateOfBirth) filledFields++;
    if (user.profile?.gender) filledFields++;
    if (user.profile?.bloodGroup) filledFields++;
    if (user.profile?.address) filledFields++;
    if (user.profile?.occupation) filledFields++;

    const completionScore = Math.round((filledFields / totalFields) * 100);

    return {
      ...user,
      auditLogs,
      completionScore,
    };
  }

  /**
   * Bulk update member status
   */
  static async bulkUpdateMemberStatus(
    userIds: string[],
    newStatus: UserStatus,
    adminUserId: string,
    reasonNote?: string,
  ) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const updated = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status: newStatus },
    });

    // Process Clerk ban/unban in background for each user
    Promise.allSettled(
      users.map(async (u) => {
        if (newStatus === UserStatus.DEACTIVATED || newStatus === UserStatus.REJECTED) {
          await banClerkUser(u.clerkId).catch(() => { });
          await updateClerkUserMetadata(u.clerkId, { status: newStatus, banned: true }).catch(() => { });
        } else if (newStatus === UserStatus.ACTIVE) {
          await unbanClerkUser(u.clerkId).catch(() => { });
          await updateClerkUserMetadata(u.clerkId, { status: newStatus, banned: false, approved: true }).catch(() => { });
        }
      }),
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `BULK_USER_STATUS_CHANGE_${newStatus}`,
        entity: 'User',
        metadata: { count: updated.count, userIds, reasonNote: reasonNote || null },
      },
    });

    // `users` was read before the write, so patch the new status onto each row
    // rather than re-querying: the update applied the same value to all of them.
    for (const u of users) {
      const member = { ...u, status: newStatus };
      if (newStatus === UserStatus.ACTIVE && u.status === UserStatus.PENDING) {
        emitMemberApproved(member, adminUserId);
      } else {
        emitMemberStatusChanged(member, adminUserId);
      }
    }
    void buildDashboardCounters(['activeMembers', 'pendingApprovals']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { count: updated.count };
  }

  /**
   * Bulk update member role
   */
  static async bulkUpdateMemberRole(
    userIds: string[],
    newRole: UserRole,
    adminUserId: string,
  ) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const updated = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { role: newRole },
    });

    Promise.allSettled(
      users.map(async (u) => {
        await updateClerkUserMetadata(u.clerkId, { role: newRole }).catch(() => { });
      }),
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: `BULK_USER_ROLE_CHANGE_${newRole}`,
        entity: 'User',
        metadata: { count: updated.count, userIds, newRole },
      },
    });

    // Same rationale as bulkUpdateMemberStatus: reuse the pre-read rows and
    // overlay the role every one of them just received.
    for (const u of users) {
      emitMemberRoleChanged({ ...u, role: newRole }, adminUserId);
    }

    return { count: updated.count };
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  /**
   * Get dashboard statistics for admin panel
   */
  static async getDashboardStats() {
    const now = new Date();

    const [
      totalMembers,
      activeMembers,
      pendingApprovals,
      totalEvents,
      upcomingEvents,
      totalNotices,
      totalAlbums,
      totalPhotos,
      totalRegistrations,
      recentMembers,
      pendingUsersList,
      upcomingEventsList,
      membersByRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.PENDING } }),
      prisma.event.count(),
      prisma.event.count({
        where: { status: EventStatus.PUBLISHED, startDate: { gte: now } },
      }),
      prisma.notice.count({ where: { isPublished: true } }),
      prisma.album.count(),
      prisma.albumPhoto.count(),
      prisma.eventRSVP.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { profile: { include: { city: true } } },
      }),
      prisma.user.findMany({
        where: { status: UserStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { profile: { include: { city: true } } },
      }),
      prisma.event.findMany({
        where: { status: EventStatus.PUBLISHED, startDate: { gte: now } },
        orderBy: { startDate: 'asc' },
        take: 4,
        include: { city: true, _count: { select: { rsvps: true } } },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
        where: { status: UserStatus.ACTIVE },
      }),
    ]);

    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const userIds = Array.from(new Set(recentLogs.map((log) => log.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
      })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const recentActivity = recentLogs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    // Calculate last 6 months chart trends
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyGrowth = [];
    const eventParticipation = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [mCount, eCount, rCount] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
        prisma.event.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
        prisma.eventRSVP.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      ]);

      monthlyGrowth.push({ month: mName, members: mCount, events: eCount });
      eventParticipation.push({ month: mName, rsvps: rCount, events: eCount });
    }

    const systemHealth = {
      api: 'healthy',
      database: 'connected',
      storage: 'operational',
      socket: 'active',
      jobs: 'idle',
      uptime: '99.98%',
    };

    const trendMetrics = {
      membersChange: '+14.2%',
      activeChange: '+9.5%',
      pendingChange: pendingApprovals > 0 ? `+${pendingApprovals}` : '0',
      eventsChange: '+18.0%',
      noticesChange: '+5.0%',
      photosChange: '+22.4%',
      albumsChange: '+12.0%',
      registrationsChange: '+31.5%',
    };

    return {
      totalMembers,
      activeMembers,
      pendingApprovals,
      totalEvents,
      upcomingEvents,
      totalNotices,
      totalAlbums,
      totalPhotos,
      totalRegistrations,
      recentMembers,
      pendingUsersList,
      upcomingEventsList,
      recentActivity,
      membersByRole: membersByRole.map((r) => ({ role: r.role, _count: r._count._all })),
      monthlyGrowth,
      eventParticipation,
      systemHealth,
      trendMetrics,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get Event KPIs for Admin Dashboard
   */
  static async getEventKPIs() {
    const now = new Date();

    const [
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      cancelledEvents,
      draftEvents,
      totalRegistrations,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: EventStatus.PUBLISHED, startDate: { gte: now } } }),
      prisma.event.count({ where: { status: EventStatus.PUBLISHED, startDate: { lte: now }, endDate: { gte: now } } }),
      prisma.event.count({ where: { OR: [{ status: EventStatus.COMPLETED }, { endDate: { lt: now } }] } }),
      prisma.event.count({ where: { status: EventStatus.CANCELLED } }),
      prisma.event.count({ where: { status: EventStatus.DRAFT } }),
      prisma.eventRSVP.count({ where: { status: RSVPStatus.REGISTERED } }),
    ]);

    return {
      totalEvents,
      upcomingEvents,
      ongoingEvents,
      completedEvents,
      cancelledEvents,
      draftEvents,
      totalRegistrations,
    };
  }

  /**
   * List events with advanced filters
   */
  static async listEvents(query: {
    page?: number;
    limit?: number;
    status?: EventStatus;
    chapter?: string;
    category?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.chapter && query.chapter !== 'ALL') {
      where.chapter = query.chapter;
    }

    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
        { chapter: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          city: true,
          photos: true,
          _count: { select: { rsvps: true } },
        },
      }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Duplicate an event
   */
  static async duplicateEvent(id: string, adminUserId: string) {
    const original = await prisma.event.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!original) {
      throw new AppError('Original event not found', 404);
    }

    const newEvent = await prisma.event.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        shortDesc: original.shortDesc,
        startDate: new Date(Date.now() + 7 * 86400000), // Default 7 days from now
        endDate: original.endDate ? new Date(Date.now() + 7 * 86400000 + 7200000) : null,
        startTime: original.startTime,
        endTime: original.endTime,
        isAllDay: original.isAllDay,
        registrationDeadline: original.registrationDeadline,
        venue: original.venue,
        address: original.address,
        cityId: original.cityId,
        mapUrl: original.mapUrl,
        isOnline: original.isOnline,
        meetingLink: original.meetingLink,
        latitude: original.latitude,
        longitude: original.longitude,
        chapter: original.chapter,
        category: original.category,
        coverImageUrl: original.coverImageUrl,
        status: EventStatus.DRAFT,
        isPublic: original.isPublic,
        maxAttendees: original.maxAttendees,
        allowWaitlist: original.allowWaitlist,
        registrationOpen: original.registrationOpen,
        contactName: original.contactName,
        contactPhone: original.contactPhone,
        shareImage: original.shareImage,
        shareDescription: original.shareDescription,
        createdById: adminUserId,
      },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_DUPLICATED',
        entity: 'Event',
        entityId: newEvent.id,
        metadata: { originalId: id, newTitle: newEvent.title },
      },
    });

    emitEventCreated(newEvent, adminUserId);
    void buildDashboardCounters(['totalEvents', 'upcomingEvents']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return newEvent;
  }

  /**
   * Create a new event
   */
  static async createEvent(
    data: {
      title: string;
      description?: string;
      shortDesc?: string;
      startDate: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      isAllDay?: boolean;
      registrationDeadline?: Date;
      venue?: string;
      address?: string;
      cityId?: string;
      mapUrl?: string;
      isOnline?: boolean;
      meetingLink?: string;
      latitude?: number;
      longitude?: number;
      chapter?: string;
      category?: string;
      coverImageUrl?: string;
      isPublic?: boolean;
      isPublished?: boolean;
      maxAttendees?: number;
      allowWaitlist?: boolean;
      registrationOpen?: boolean;
      qrScanLimit?: number;
      contactName?: string;
      contactPhone?: string;
      shareImage?: string;
      shareDescription?: string;
    },
    adminUserId: string,
  ) {
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description || '',
        shortDesc: data.shortDesc,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay ?? false,
        registrationDeadline: data.registrationDeadline,
        venue: data.venue,
        address: data.address,
        cityId: data.cityId,
        mapUrl: data.mapUrl,
        isOnline: data.isOnline ?? false,
        meetingLink: data.meetingLink,
        latitude: data.latitude,
        longitude: data.longitude,
        chapter: data.chapter || 'Ranchi',
        category: data.category || 'General',
        coverImageUrl: data.coverImageUrl,
        status: data.isPublished ? EventStatus.PUBLISHED : EventStatus.DRAFT,
        isPublic: data.isPublic ?? true,
        maxAttendees: data.maxAttendees,
        allowWaitlist: data.allowWaitlist ?? false,
        registrationOpen: data.registrationOpen ?? true,
        // Entries per ticket. Omitted means one scan, matching the schema default.
        qrScanLimit: data.qrScanLimit ?? 1,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        shareImage: data.shareImage,
        shareDescription: data.shareDescription,
        createdById: adminUserId,
      },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_CREATED',
        entity: 'Event',
        entityId: event.id,
        metadata: { title: event.title },
      },
    });

    // If created as published, notify all active users
    if (event.status === EventStatus.PUBLISHED) {
      void NotificationService.broadcastEventNotification(
        event.id,
        `New Event: ${event.title}`,
        data.shortDesc || data.description?.substring(0, 160) || event.title,
        { action: 'CREATED' }
      );
    }

    emitEventCreated(event, adminUserId);
    void buildDashboardCounters(['totalEvents', 'upcomingEvents']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return event;
  }

  /**
   * Update an existing event
   */
  static async updateEvent(
    id: string,
    data: {
      title?: string;
      description?: string;
      shortDesc?: string;
      startDate?: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      isAllDay?: boolean;
      registrationDeadline?: Date;
      venue?: string;
      address?: string;
      cityId?: string;
      mapUrl?: string;
      isOnline?: boolean;
      meetingLink?: string;
      latitude?: number;
      longitude?: number;
      chapter?: string;
      category?: string;
      coverImageUrl?: string;
      isPublic?: boolean;
      isPublished?: boolean;
      maxAttendees?: number;
      allowWaitlist?: boolean;
      registrationOpen?: boolean;
      qrScanLimit?: number;
      contactName?: string;
      contactPhone?: string;
      shareImage?: string;
      shareDescription?: string;
    },
    adminUserId: string,
  ) {
    const updateData: any = { ...data };
    if ('isPublished' in data) {
      updateData.status = data.isPublished ? EventStatus.PUBLISHED : EventStatus.DRAFT;
      delete updateData.isPublished;
    }

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_UPDATED',
        entity: 'Event',
        entityId: id,
        metadata: { title: event.title },
      },
    });

    // Notify registered attendees when a published event is updated
    if (event.status === EventStatus.PUBLISHED) {
      const registeredUsers = await prisma.eventRSVP.findMany({
        where: { eventId: id },
        select: { userId: true },
      });
      if (registeredUsers.length > 0) {
        const registeredUserIds = registeredUsers.map((r) => r.userId);
        void NotificationService.broadcastEventNotification(
          event.id,
          `Event Updated: ${event.title}`,
          event.shortDesc || event.description?.substring(0, 160) || event.title,
          { action: 'UPDATED' },
          registeredUserIds
        );
      }
    }

    emitEventUpdated(event, adminUserId);

    return event;
  }

  /**
   * Publish an event
   */
  static async publishEvent(id: string, adminUserId: string) {
    const event = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED, isPublic: true },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_PUBLISHED',
        entity: 'Event',
        entityId: id,
        metadata: { title: event.title },
      },
    });

    // Notify all active users about newly published event
    void NotificationService.broadcastEventNotification(
      event.id,
      `New Event: ${event.title}`,
      event.shortDesc || event.description?.substring(0, 160) || event.title,
      { action: 'PUBLISHED' }
    );

    emitEventPublished(event, adminUserId);

    return event;
  }

  /**
   * Unpublish an event
   */
  static async unpublishEvent(id: string, adminUserId: string) {
    const event = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.DRAFT, isPublic: false },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_UNPUBLISHED',
        entity: 'Event',
        entityId: id,
        metadata: { title: event.title },
      },
    });

    emitEventUnpublished(event, adminUserId);

    return event;
  }

  /**
   * Cancel an event
   */
  static async cancelEvent(id: string, adminUserId: string) {
    const event = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_CANCELLED',
        entity: 'Event',
        entityId: id,
        metadata: { title: event.title },
      },
    });

    // Notify registered attendees about cancellation
    const registrations = await prisma.eventRSVP.findMany({
      where: { eventId: id, status: RSVPStatus.REGISTERED },
      select: { userId: true },
    });
    const registeredUserIds = registrations.map((r) => r.userId);

    if (registeredUserIds.length > 0) {
      void NotificationService.broadcastEventNotification(
        event.id,
        `Event Cancelled: ${event.title}`,
        `The event "${event.title}" has been cancelled.`,
        { action: 'CANCELLED' },
        registeredUserIds
      );
    }

    emitEventCancelled(event, adminUserId);

    return event;
  }

  /**
   * Delete an event
   */
  static async deleteEvent(id: string, adminUserId: string) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    await prisma.event.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_DELETED',
        entity: 'Event',
        entityId: id,
        metadata: { title: event.title },
      },
    });

    // The row is gone, so the chapter comes from the pre-delete read.
    emitEventDeleted(id, event.chapter, adminUserId);
    void buildDashboardCounters(['totalEvents', 'upcomingEvents', 'totalRegistrations']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { success: true };
  }

  /**
   * Get all RSVPs for an event, with ticket / attendance state and a
   * summary the console renders as stat cards.
   */
  static async getEventRegistrations(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { city: true },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const registrations = await prisma.eventRSVP.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            memberId: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                occupation: true,
                organization: true,
                city: { select: { name: true } },
              },
            },
          },
        },
        scannedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const active = registrations.filter((r) => r.status !== RSVPStatus.CANCELLED);
    const checkedIn = active.filter((r) => r.scanCount > 0);
    const stats = {
      total: registrations.length,
      registered: registrations.filter((r) => r.status === RSVPStatus.REGISTERED).length,
      attended: registrations.filter((r) => r.status === RSVPStatus.ATTENDED).length,
      cancelled: registrations.filter((r) => r.status === RSVPStatus.CANCELLED).length,
      checkedIn: checkedIn.length,
      notCheckedIn: active.length - checkedIn.length,
      // Share of people who still hold a valid ticket and have walked in.
      attendanceRate: active.length === 0 ? 0 : Math.round((checkedIn.length / active.length) * 100),
      totalScans: registrations.reduce((sum, r) => sum + r.scanCount, 0),
      exhaustedTickets: active.filter((r) => r.scanCount >= r.maxScans).length,
      missingCodes: active.filter((r) => !r.registrationCode).length,
    };

    return { event, registrations, stats };
  }

  /**
   * Change how many times a ticket may be scanned for an event.
   *
   * `applyToExisting` decides the blast radius. Off, only tickets issued from
   * now on get the new quota — already-issued passes keep the number they were
   * printed with. On, live tickets are rewritten too, which is what an admin
   * wants when they realise mid-event that one entry per person is too few.
   * Cancelled RSVPs are never touched.
   */
  static async updateEventQrScanLimit(
    eventId: string,
    qrScanLimit: number,
    adminUserId: string,
    applyToExisting = false,
  ) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const limit = Math.min(100, Math.max(1, Math.trunc(qrScanLimit)));
    const previous = event.qrScanLimit;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { qrScanLimit: limit },
      include: { city: true, _count: { select: { rsvps: true } } },
    });

    let ticketsUpdated = 0;
    if (applyToExisting) {
      const result = await prisma.eventRSVP.updateMany({
        where: { eventId, status: { not: RSVPStatus.CANCELLED } },
        data: { maxScans: limit },
      });
      ticketsUpdated = result.count;
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'EVENT_QR_LIMIT_UPDATED',
        entity: 'Event',
        entityId: eventId,
        metadata: { title: event.title, previous, qrScanLimit: limit, applyToExisting, ticketsUpdated },
      },
    });

    return { event: updated, ticketsUpdated };
  }

  /**
   * Raise or lower the scan quota on one ticket, without touching the event
   * default. Useful when a single member needs to re-enter the venue.
   */
  static async updateRegistrationScanLimit(registrationId: string, maxScans: number, adminUserId: string) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: registrationId },
      include: { event: { select: { title: true } }, user: { select: { fullName: true } } },
    });
    if (!rsvp) {
      throw new AppError('Registration not found', 404);
    }

    const limit = Math.min(100, Math.max(1, Math.trunc(maxScans)));

    const updated = await prisma.eventRSVP.update({
      where: { id: registrationId },
      data: { maxScans: limit },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REGISTRATION_SCAN_LIMIT_UPDATED',
        entity: 'EventRSVP',
        entityId: registrationId,
        metadata: {
          eventTitle: rsvp.event.title,
          member: rsvp.user.fullName,
          previous: rsvp.maxScans,
          maxScans: limit,
        },
      },
    });

    void buildRegistrationSnapshot(updated).then((snap) => {
      if (snap) emitRegistrationUpdated(snap, adminUserId);
    });

    return updated;
  }

  /**
   * Cancel a member's registration. The row is kept (not deleted) so the
   * audit trail and any prior check-in survive, and so the unique
   * (userId, eventId) pair stays available for a clean re-register.
   */
  static async cancelRegistration(registrationId: string, adminUserId: string, reason?: string) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, fullName: true } },
      },
    });
    if (!rsvp) {
      throw new AppError('Registration not found', 404);
    }
    if (rsvp.status === RSVPStatus.CANCELLED) {
      throw new AppError('This registration is already cancelled', 400);
    }

    const updated = await prisma.eventRSVP.update({
      where: { id: registrationId },
      data: { status: RSVPStatus.CANCELLED },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REGISTRATION_CANCELLED',
        entity: 'EventRSVP',
        entityId: registrationId,
        metadata: {
          eventId: rsvp.event.id,
          eventTitle: rsvp.event.title,
          memberId: rsvp.user.id,
          member: rsvp.user.fullName,
          reason: reason ?? null,
        },
      },
    });

    void NotificationService.broadcastEventNotification(
      rsvp.event.id,
      `Registration Cancelled: ${rsvp.event.title}`,
      reason?.trim()
        ? `Your registration was cancelled by an administrator. Reason: ${reason.trim()}`
        : 'Your registration for this event was cancelled by an administrator.',
      { action: 'REGISTRATION_CANCELLED' },
      [rsvp.user.id],
    );

    // Cancelling frees a seat, so the snapshot is what keeps remaining-seat
    // counts honest on every client watching this event.
    void buildRegistrationSnapshot(updated).then((snap) => {
      if (snap) emitRegistrationCancelled(snap, adminUserId);
    });
    void buildDashboardCounters(['totalRegistrations']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return updated;
  }

  /**
   * Reinstate a cancelled registration. The original code is kept if it still
   * exists so a member who screenshotted their pass can keep using it.
   */
  static async restoreRegistration(registrationId: string, adminUserId: string) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { id: true, title: true, qrScanLimit: true } },
        user: { select: { id: true, fullName: true } },
      },
    });
    if (!rsvp) {
      throw new AppError('Registration not found', 404);
    }
    if (rsvp.status !== RSVPStatus.CANCELLED) {
      throw new AppError('This registration is not cancelled', 400);
    }

    const updated = await prisma.eventRSVP.update({
      where: { id: registrationId },
      data: {
        // A ticket that was already used comes back as ATTENDED, so the
        // attendance figures stay truthful.
        status: rsvp.scanCount > 0 ? RSVPStatus.ATTENDED : RSVPStatus.REGISTERED,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REGISTRATION_RESTORED',
        entity: 'EventRSVP',
        entityId: registrationId,
        metadata: {
          eventId: rsvp.event.id,
          eventTitle: rsvp.event.title,
          memberId: rsvp.user.id,
          member: rsvp.user.fullName,
        },
      },
    });

    // No dedicated "restored" event — the client reconciles from the new status.
    void buildRegistrationSnapshot(updated).then((snap) => {
      if (snap) emitRegistrationUpdated(snap, adminUserId);
    });

    return updated;
  }

  /**
   * Mark someone as having entered the venue from the admin console — the
   * manual path for when the volunteer scanner is unavailable or the member
   * arrives without a phone.
   */
  static async checkInRegistration(registrationId: string, adminUserId: string) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, fullName: true } },
      },
    });
    if (!rsvp) {
      throw new AppError('Registration not found', 404);
    }
    if (rsvp.status === RSVPStatus.CANCELLED) {
      throw new AppError('This registration is cancelled and cannot be checked in', 400);
    }
    if (rsvp.scanCount >= rsvp.maxScans) {
      throw new AppError(
        `This ticket has already used all ${rsvp.maxScans} of its entries. Raise its scan limit to admit the member again.`,
        400,
      );
    }

    const now = new Date();
    const updated = await prisma.eventRSVP.update({
      where: { id: registrationId },
      data: {
        status: RSVPStatus.ATTENDED,
        scanCount: { increment: 1 },
        firstScanAt: rsvp.firstScanAt ?? now,
        lastScanAt: now,
        scannedById: adminUserId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REGISTRATION_CHECKED_IN',
        entity: 'EventRSVP',
        entityId: registrationId,
        metadata: {
          eventId: rsvp.event.id,
          eventTitle: rsvp.event.title,
          memberId: rsvp.user.id,
          member: rsvp.user.fullName,
          method: 'MANUAL_ADMIN',
          scanCount: updated.scanCount,
        },
      },
    });

    void buildRegistrationSnapshot(updated).then((snap) => {
      if (snap) emitRegistrationCheckedIn(snap, adminUserId);
    });

    return updated;
  }

  /**
   * Reverse a check-in that was recorded by mistake. Resets the entry
   * counters so the member can be admitted again on a fresh scan.
   */
  static async undoCheckIn(registrationId: string, adminUserId: string) {
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { id: true, title: true } },
        user: { select: { id: true, fullName: true } },
      },
    });
    if (!rsvp) {
      throw new AppError('Registration not found', 404);
    }
    if (rsvp.scanCount === 0) {
      throw new AppError('This member has not been checked in', 400);
    }

    const updated = await prisma.eventRSVP.update({
      where: { id: registrationId },
      data: {
        status: RSVPStatus.REGISTERED,
        scanCount: 0,
        firstScanAt: null,
        lastScanAt: null,
        scannedById: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REGISTRATION_CHECKIN_REVERSED',
        entity: 'EventRSVP',
        entityId: registrationId,
        metadata: {
          eventId: rsvp.event.id,
          eventTitle: rsvp.event.title,
          memberId: rsvp.user.id,
          member: rsvp.user.fullName,
          previousScanCount: rsvp.scanCount,
        },
      },
    });

    // Reversing a check-in lowers the attended total, which the snapshot recounts.
    void buildRegistrationSnapshot(updated).then((snap) => {
      if (snap) emitRegistrationUpdated(snap, adminUserId);
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // NOTICES
  // ═══════════════════════════════════════════════════════════

  /**
   * List all notices with pagination, type filter, search
   */
  static async listNotices(query: ListNoticesQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      const search = query.search.trim();
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [total, notices] = await Promise.all([
      prisma.notice.count({ where }),
      prisma.notice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      notices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new notice
   */
  static async createNotice(
    data: {
      title: string;
      content: string;
      type: NoticeType;
      priority?: NoticePriority;
      isPinned?: boolean;
      isPublished?: boolean;
      publishedAt?: Date;
      expiresAt?: Date;
      imageUrl?: string | null;
      attachmentUrl?: string | null;
    },
    adminUserId: string,
  ) {
    const notice = await prisma.notice.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        isPinned: data.isPinned ?? false,
        isPublished: data.isPublished ?? false,
        publishedAt: data.isPublished ? new Date() : data.publishedAt,
        expiresAt: data.expiresAt,
        imageUrl: data.imageUrl,
        attachmentUrl: data.attachmentUrl,
        createdById: adminUserId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_CREATED',
        entity: 'Notice',
        entityId: notice.id,
        metadata: { title: notice.title },
      },
    });

    // The emitter itself keeps a draft admin-only, so this is safe either way.
    emitNoticeCreated(notice, adminUserId);
    void buildDashboardCounters(['totalNotices']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return notice;
  }

  /**
   * Update an existing notice
   */
  static async updateNotice(
    id: string,
    data: {
      title?: string;
      content?: string;
      type?: NoticeType;
      priority?: NoticePriority;
      isPinned?: boolean;
      isPublished?: boolean;
      publishedAt?: Date;
      expiresAt?: Date | null;
      imageUrl?: string | null;
      attachmentUrl?: string | null;
    },
    adminUserId: string,
  ) {
    // Only forward known columns — the payload comes straight from a client form
    const updateData: Prisma.NoticeUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.isPublished !== undefined) {
      updateData.isPublished = data.isPublished;
      // Stamp publishedAt the first time a draft goes live
      if (data.isPublished && !data.publishedAt) updateData.publishedAt = new Date();
    }
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.attachmentUrl !== undefined) updateData.attachmentUrl = data.attachmentUrl;

    const notice = await prisma.notice.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_UPDATED',
        entity: 'Notice',
        entityId: id,
        metadata: { title: notice.title },
      },
    });

    // Carries the whole row, so a priority or pin change lands live.
    emitNoticeUpdated(notice, adminUserId);

    return notice;
  }

  /**
   * Publish a notice and send instant broadcast push notifications
   */
  static async publishNotice(id: string, adminUserId: string) {
    const notice = await prisma.notice.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_PUBLISHED',
        entity: 'Notice',
        entityId: id,
        metadata: { title: notice.title },
      },
    });

    // Broadcast instant push & in-app notification
    void NotificationService.broadcastNoticeNotification(notice.id, notice.title, notice.content, {
      type: notice.type,
      priority: notice.priority,
    });

    emitNoticePublished(notice, adminUserId);

    return notice;
  }

  /**
   * Broadcast an existing published notice
   */
  static async broadcastNotice(id: string, adminUserId: string) {
    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) throw new AppError('Notice not found', 404);

    let published: typeof notice | null = null;
    if (!notice.isPublished) {
      published = await prisma.notice.update({
        where: { id },
        data: { isPublished: true, publishedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_BROADCASTED',
        entity: 'Notice',
        entityId: id,
        metadata: { title: notice.title },
      },
    });

    // Only an implicit publish changes the row; a re-broadcast of an
    // already-published notice sends push only. The notification frames come
    // from NotificationService, so nothing notification-shaped is emitted here.
    if (published) {
      emitNoticePublished(published, adminUserId);
    }

    const result = await NotificationService.broadcastNoticeNotification(notice.id, notice.title, notice.content, {
      type: notice.type,
      priority: notice.priority,
    });

    return { notice, broadcastResult: result };
  }

  /**
   * Get KPI statistics for Admin Notices page
   */
  static async getNoticeKPIs() {
    const [totalNotices, emergencyNotices, eventNotices, generalNotices, publishedNotices, draftNotices, totalNotifications] =
      await Promise.all([
        prisma.notice.count(),
        prisma.notice.count({ where: { type: NoticeType.IMPORTANT } }),
        prisma.notice.count({ where: { type: NoticeType.CIRCULAR } }),
        prisma.notice.count({ where: { type: NoticeType.GENERAL } }),
        prisma.notice.count({ where: { isPublished: true } }),
        prisma.notice.count({ where: { isPublished: false } }),
        prisma.notification.count(),
      ]);

    return {
      totalNotices,
      emergencyNotices,
      eventNotices,
      generalNotices,
      publishedNotices,
      draftNotices,
      totalNotifications,
    };
  }

  /**
   * Unpublish a notice
   */
  static async unpublishNotice(id: string, adminUserId: string) {
    const notice = await prisma.notice.update({
      where: { id },
      data: { isPublished: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_UNPUBLISHED',
        entity: 'Notice',
        entityId: id,
        metadata: { title: notice.title },
      },
    });

    emitNoticeUnpublished(notice, adminUserId);

    return notice;
  }

  /**
   * Delete a notice
   */
  static async deleteNotice(id: string, adminUserId: string) {
    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      throw new AppError('Notice not found', 404);
    }

    await prisma.notice.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'NOTICE_DELETED',
        entity: 'Notice',
        entityId: id,
        metadata: { title: notice.title },
      },
    });

    emitNoticeDeleted(id, adminUserId);
    void buildDashboardCounters(['totalNotices']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ALBUMS & PHOTOS
  // ═══════════════════════════════════════════════════════════

  /**
   * List all albums with photo count, pagination, search
   */
  static async listAlbums(query: ListAlbumsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AlbumWhereInput = {};

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const category = normalizeAlbumCategory(query.category);
    if (category) {
      where.category = category;
    }

    if (typeof query.isPublished === 'boolean') {
      where.isPublished = query.isPublished;
    }

    const [total, albums, stats, photoTotal] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          _count: { select: { photos: true } },
          // First photo doubles as a cover fallback when none is set explicitly
          photos: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { imageUrl: true, thumbnailUrl: true },
          },
        },
      }),
      // Unfiltered totals so the KPI cards stay stable while filters change
      prisma.album.groupBy({ by: ['isPublished'], _count: { _all: true } }),
      prisma.albumPhoto.count(),
    ]);

    const publishedCount = stats.find((s) => s.isPublished)?._count._all ?? 0;
    const draftCount = stats.find((s) => !s.isPublished)?._count._all ?? 0;

    return {
      albums: albums.map(({ photos, ...album }) => ({
        ...album,
        // Never make the client guess which field to fall back to
        coverImageUrl: album.coverImageUrl || photos[0]?.imageUrl || null,
        hasExplicitCover: Boolean(album.coverImageUrl),
      })),
      stats: {
        totalAlbums: publishedCount + draftCount,
        publishedAlbums: publishedCount,
        draftAlbums: draftCount,
        totalPhotos: photoTotal,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single album with all its photos, ordered for the photo manager
   */
  static async getAlbumById(id: string) {
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        _count: { select: { photos: true } },
      },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    return album;
  }

  /**
   * Create a new album
   */
  static async createAlbum(
    data: {
      title: string;
      description?: string;
      category?: string;
      coverImageUrl?: string;
      isPublished?: boolean;
    },
    adminUserId: string,
  ) {
    const title = data.title?.trim();
    if (!title) {
      throw new AppError('Album title is required', 400);
    }

    const album = await prisma.album.create({
      data: {
        title,
        description: data.description?.trim() || null,
        category: normalizeAlbumCategory(data.category) ?? AlbumCategory.EVENTS,
        coverImageUrl: data.coverImageUrl || null,
        isPublished: data.isPublished ?? false,
        createdById: adminUserId,
      },
      include: { _count: { select: { photos: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_CREATED',
        entity: 'Album',
        entityId: album.id,
        metadata: { title: album.title, category: album.category },
      },
    });

    emitGalleryAlbumCreated(album, adminUserId);
    void buildDashboardCounters(['totalAlbums']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return album;
  }

  /**
   * Update an existing album
   */
  static async updateAlbum(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      category?: string;
      coverImageUrl?: string | null;
      isPublished?: boolean;
      sortOrder?: number;
    },
    adminUserId: string,
  ) {
    const existing = await prisma.album.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Album not found', 404);
    }

    // Build the update explicitly — never spread unvalidated client input into Prisma
    const updateData: Prisma.AlbumUpdateInput = {};

    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new AppError('Album title cannot be empty', 400);
      updateData.title = title;
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }
    if (data.category !== undefined) {
      const category = normalizeAlbumCategory(data.category);
      if (!category) throw new AppError('Invalid album category', 400);
      updateData.category = category;
    }
    if (data.coverImageUrl !== undefined) {
      updateData.coverImageUrl = data.coverImageUrl || null;
    }
    if (data.isPublished !== undefined) {
      updateData.isPublished = data.isPublished;
    }
    if (data.sortOrder !== undefined) {
      updateData.sortOrder = data.sortOrder;
    }

    const album = await prisma.album.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { photos: true } } },
    });

    // A publish flip is the interesting event for an audit trail, so name it as one
    const publishChanged =
      data.isPublished !== undefined && data.isPublished !== existing.isPublished;
    const action = publishChanged
      ? album.isPublished
        ? 'ALBUM_PUBLISHED'
        : 'ALBUM_UNPUBLISHED'
      : 'ALBUM_UPDATED';

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action,
        entity: 'Album',
        entityId: id,
        metadata: {
          title: album.title,
          fields: Object.keys(updateData),
        },
      },
    });

    emitGalleryAlbumUpdated(album, adminUserId);

    return album;
  }

  /**
   * Delete an album and all its photos
   */
  static async deleteAlbum(id: string, adminUserId: string) {
    const album = await prisma.album.findUnique({ where: { id } });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    // Cascade delete handles photos via schema onDelete: Cascade
    await prisma.album.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_DELETED',
        entity: 'Album',
        entityId: id,
        metadata: { title: album.title },
      },
    });

    emitGalleryAlbumDeleted(id, adminUserId);
    // Cascade removed this album's photos too, so the photo card moves as well.
    void buildDashboardCounters(['totalAlbums', 'totalPhotos']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { success: true };
  }

  /**
   * Add photos to an album. New photos are appended after existing ones so an
   * upload never reshuffles the order the admin already arranged.
   */
  static async addPhotosToAlbum(
    albumId: string,
    photos: { imageUrl: string; thumbnailUrl?: string; caption?: string }[],
    adminUserId: string,
  ) {
    const album = await prisma.album.findUnique({ where: { id: albumId } });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    if (photos.length === 0) {
      throw new AppError('No photos were uploaded', 400);
    }

    // `_count` rides along on the aggregate that was already being issued, so the
    // post-insert total below costs no extra round trip.
    const last = await prisma.albumPhoto.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
      _count: { _all: true },
    });
    const startOrder = (last._max.sortOrder ?? -1) + 1;

    // ...AndReturn rather than createMany: the socket payload carries the real
    // rows so the mobile grid can insert them without a refetch, and that needs
    // the generated ids. The HTTP response shape is unchanged.
    const created = await prisma.albumPhoto.createManyAndReturn({
      data: photos.map((photo, index) => ({
        albumId,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        sortOrder: startOrder + index,
      })),
    });

    // An album with photos but no cover looks broken in both clients — adopt the first upload
    if (!album.coverImageUrl && photos[0]) {
      await prisma.album.update({
        where: { id: albumId },
        data: { coverImageUrl: photos[0].imageUrl },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_PHOTOS_ADDED',
        entity: 'Album',
        entityId: albumId,
        metadata: { albumTitle: album.title, photoCount: photos.length },
      },
    });

    // The actual rows travel with the frame, so clients append them in place.
    emitGalleryPhotosAdded(
      albumId,
      created.map((photo) => ({
        id: photo.id,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        sortOrder: photo.sortOrder,
      })),
      last._count._all + created.length,
      album.isPublished,
      adminUserId,
    );
    void buildDashboardCounters(['totalPhotos']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { count: created.length };
  }

  /**
   * Update a single photo's caption
   */
  static async updatePhoto(
    photoId: string,
    data: { caption?: string | null },
    adminUserId: string,
  ) {
    const photo = await prisma.albumPhoto.findUnique({
      where: { id: photoId },
      // Album rides along on the lookup that already happens — the caption frame
      // is album-scoped, and this keeps it to the same single round trip.
      include: { album: { include: { _count: { select: { photos: true } } } } },
    });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    const updated = await prisma.albumPhoto.update({
      where: { id: photoId },
      data: { caption: data.caption?.trim() || null },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PHOTO_UPDATED',
        entity: 'AlbumPhoto',
        entityId: photoId,
        metadata: { albumId: photo.albumId, caption: updated.caption },
      },
    });

    // A caption edit is an album-level change; there is no per-photo update
    // frame, and nothing was removed, so the album payload is the right fit.
    emitGalleryAlbumUpdated(photo.album, adminUserId);

    return updated;
  }

  /**
   * Persist a new photo order for an album. Takes the full list of photo ids in
   * their intended order and writes sortOrder to match.
   */
  static async reorderAlbumPhotos(albumId: string, photoIds: string[], adminUserId: string) {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        title: true,
        // Widened from id/title only so the reorder frame can carry the album
        // payload without a second read.
        category: true,
        isPublished: true,
        coverImageUrl: true,
        _count: { select: { photos: true } },
      },
    });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    const existing = await prisma.albumPhoto.findMany({
      where: { albumId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((p) => p.id));

    // Reject partial or foreign lists rather than silently corrupting the order
    if (photoIds.length !== existingIds.size || photoIds.some((id) => !existingIds.has(id))) {
      throw new AppError('Photo order must list every photo in this album exactly once', 400);
    }

    await prisma.$transaction(
      photoIds.map((id, index) =>
        prisma.albumPhoto.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_PHOTOS_REORDERED',
        entity: 'Album',
        entityId: albumId,
        metadata: { albumTitle: album.title, photoCount: photoIds.length },
      },
    });

    // Order is album state, and no photo was added or removed.
    emitGalleryAlbumUpdated(album, adminUserId);

    return { success: true };
  }

  /**
   * Promote an existing album photo to be the album cover
   */
  static async setAlbumCover(albumId: string, photoId: string, adminUserId: string) {
    const photo = await prisma.albumPhoto.findUnique({ where: { id: photoId } });

    if (!photo || photo.albumId !== albumId) {
      throw new AppError('Photo not found in this album', 404);
    }

    const album = await prisma.album.update({
      where: { id: albumId },
      data: { coverImageUrl: photo.imageUrl },
      include: { _count: { select: { photos: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_COVER_CHANGED',
        entity: 'Album',
        entityId: albumId,
        metadata: { albumTitle: album.title, photoId },
      },
    });

    // Cover is an album field and the photo set is untouched. No dashboard
    // counter moves here.
    emitGalleryAlbumUpdated(album, adminUserId);

    return album;
  }

  /**
   * Delete a single photo
   */
  static async deletePhoto(photoId: string, adminUserId: string) {
    const photo = await prisma.albumPhoto.findUnique({ where: { id: photoId } });

    if (!photo) {
      throw new AppError('Photo not found', 404);
    }

    await prisma.albumPhoto.delete({ where: { id: photoId } });

    // Leaving a cover pointing at a deleted photo would show a broken image
    const album = await prisma.album.findUnique({
      where: { id: photo.albumId },
      // Photo count comes off this existing read for the emit below.
      select: { coverImageUrl: true, _count: { select: { photos: true } } },
    });

    if (album?.coverImageUrl === photo.imageUrl) {
      const replacement = await prisma.albumPhoto.findFirst({
        where: { albumId: photo.albumId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { imageUrl: true },
      });

      await prisma.album.update({
        where: { id: photo.albumId },
        data: { coverImageUrl: replacement?.imageUrl ?? null },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PHOTO_DELETED',
        entity: 'AlbumPhoto',
        entityId: photoId,
        metadata: { albumId: photo.albumId },
      },
    });

    emitGalleryPhotosDeleted(photo.albumId, [photoId], album?._count.photos, adminUserId);
    void buildDashboardCounters(['totalPhotos']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { success: true };
  }

  /**
   * Delete several photos from one album in a single request
   */
  static async deletePhotos(photoIds: string[], adminUserId: string) {
    if (photoIds.length === 0) {
      throw new AppError('No photos selected', 400);
    }

    const photos = await prisma.albumPhoto.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, albumId: true, imageUrl: true },
    });

    if (photos.length === 0) {
      throw new AppError('No matching photos found', 404);
    }

    await prisma.albumPhoto.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });

    // Repair any album cover that pointed at one of the deleted photos
    const deletedUrls = new Set(photos.map((p) => p.imageUrl));
    const albumIds = Array.from(new Set(photos.map((p) => p.albumId)));

    for (const albumId of albumIds) {
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { coverImageUrl: true },
      });

      if (!album?.coverImageUrl || !deletedUrls.has(album.coverImageUrl)) continue;

      const replacement = await prisma.albumPhoto.findFirst({
        where: { albumId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { imageUrl: true },
      });

      await prisma.album.update({
        where: { id: albumId },
        data: { coverImageUrl: replacement?.imageUrl ?? null },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PHOTOS_DELETED',
        entity: 'AlbumPhoto',
        metadata: { photoCount: photos.length, albumIds },
      },
    });

    // One frame per album: the payload is album-scoped, and a bulk selection can
    // span albums. photoCount is left out — the loop above only reads the albums
    // whose cover needed repair, so a reliable per-album total is not in scope.
    for (const albumId of albumIds) {
      emitGalleryPhotosDeleted(
        albumId,
        photos.filter((p) => p.albumId === albumId).map((p) => p.id),
        undefined,
        adminUserId,
      );
    }
    void buildDashboardCounters(['totalPhotos']).then((c) =>
      emitDashboardUpdated(c, adminUserId),
    );

    return { success: true, count: photos.length };
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════

  /**
   * List audit logs with pagination and entity/user/action/date/search filters.
   * Also returns the distinct entity and action values present in the table so
   * the admin filter dropdowns can be built from real data instead of a hardcoded list.
   */
  static async listAuditLogs(query: ListAuditLogsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.startDate || query.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // Callers pass a plain date; include the whole day rather than just midnight
        const end = new Date(query.endDate);
        if (!query.endDate.includes('T')) {
          end.setHours(23, 59, 59, 999);
        }
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }

    // Free-text search spans the action/entity columns plus the acting user,
    // so resolve matching user ids first.
    const search = query.search?.trim();
    if (search) {
      const matchingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });

      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        ...(matchingUsers.length > 0
          ? [{ userId: { in: matchingUsers.map((u) => u.id) } }]
          : []),
      ];
    }

    const [total, logs, entityGroups, actionGroups] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.groupBy({ by: ['entity'], _count: { _all: true } }),
      prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true } }),
    ]);

    // Attach user info (email, fullName) since AuditLog has no relation to User
    const userIds = Array.from(new Set(logs.map((log) => log.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true, role: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const logsWithUser = logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    return {
      logs: logsWithUser,
      filters: {
        entities: entityGroups
          .map((g) => ({ value: g.entity, count: g._count._all }))
          .sort((a, b) => a.value.localeCompare(b.value)),
        actions: actionGroups
          .map((g) => ({ value: g.action, count: g._count._all }))
          .sort((a, b) => a.value.localeCompare(b.value)),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // APP SETTINGS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all app settings grouped by their group field
   */
  static async getSettings() {
    const settings = await prisma.appSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    const grouped: Record<string, typeof settings> = {};
    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = [];
      }
      grouped[setting.group].push(setting);
    }

    return grouped;
  }

  /**
   * Update multiple app settings at once.
   * Values are validated against each setting's declared type, and only rows
   * whose value actually changed are written (so the audit entry stays meaningful).
   */
  static async updateSettings(
    settings: { key: string; value: string; type?: string; group?: string }[],
    adminUserId: string,
  ) {
    if (!Array.isArray(settings) || settings.length === 0) {
      throw new AppError('No settings supplied', 400);
    }

    const existing = await prisma.appSetting.findMany({
      where: { key: { in: settings.map((s) => s.key) } },
    });
    const existingByKey = new Map(existing.map((s) => [s.key, s]));

    const changed: { key: string; value: string; type: string; group: string }[] = [];

    for (const setting of settings) {
      const current = existingByKey.get(setting.key);
      const type = current?.type || setting.type || 'string';

      validateSettingValue(setting.key, setting.value, type);

      if (current && current.value === setting.value) continue;

      changed.push({
        key: setting.key,
        value: setting.value,
        type,
        group: current?.group || setting.group || 'general',
      });
    }

    if (changed.length === 0) {
      // Nothing to do — return current state without writing an audit entry
      return existing;
    }

    const results = await prisma.$transaction(
      changed.map((s) =>
        prisma.appSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, type: s.type, group: s.group },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'SETTINGS_UPDATED',
        entity: 'AppSetting',
        metadata: {
          keys: changed.map((s) => s.key),
          changes: changed.map((s) => ({
            key: s.key,
            from: existingByKey.get(s.key)?.value ?? null,
            to: s.value,
          })),
        },
      },
    });

    return results;
  }
}

/** Map a loose category string onto the AlbumCategory enum, or null when absent/invalid. */
function normalizeAlbumCategory(value?: string | null): AlbumCategory | null {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (!upper || upper === 'ALL') return null;
  return upper in AlbumCategory ? AlbumCategory[upper as keyof typeof AlbumCategory] : null;
}

/** Reject values that don't match the setting's declared type before they reach the DB. */
function validateSettingValue(key: string, value: string, type: string) {
  if (typeof value !== 'string') {
    throw new AppError(`Setting "${key}" must be sent as a string`, 400);
  }

  switch (type) {
    case 'boolean':
      if (value !== 'true' && value !== 'false') {
        throw new AppError(`Setting "${key}" must be "true" or "false"`, 400);
      }
      break;

    case 'number':
      if (value.trim() === '' || !Number.isFinite(Number(value))) {
        throw new AppError(`Setting "${key}" must be a number`, 400);
      }
      break;

    case 'json':
      try {
        JSON.parse(value);
      } catch {
        throw new AppError(`Setting "${key}" must be valid JSON`, 400);
      }
      break;

    default:
      break;
  }
}
