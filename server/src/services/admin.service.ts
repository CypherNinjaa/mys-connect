import { prisma } from '../utils/prisma';
import { UserStatus, UserRole, EventStatus, NoticeType, NoticePriority } from '@prisma/client';
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
}

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  entity?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
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

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  /**
   * Get dashboard statistics for admin panel
   */
  static async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Parallel queries for all counts
    const [
      totalMembers,
      upcomingEvents,
      totalNotices,
      galleryImages,
      newRegistrations,
    ] = await Promise.all([
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.event.count({
        where: { status: EventStatus.PUBLISHED, startDate: { gte: now } },
      }),
      prisma.notice.count({ where: { isPublished: true } }),
      prisma.albumPhoto.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // Member growth — last 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const memberGrowth: { month: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const count = await prisma.user.count({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      memberGrowth.push({ month: monthNames[startOfMonth.getMonth()], count });
    }

    // Recent activities — last 10 audit log entries with user info
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const userIds = Array.from(new Set(recentLogs.map((log) => log.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const recentActivities = recentLogs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    return {
      totalMembers,
      upcomingEvents,
      totalNotices,
      galleryImages,
      newRegistrations,
      memberGrowth,
      recentActivities,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════

  /**
   * List all events (including DRAFT) with pagination, status filter, search
   */
  static async listEvents(query: ListEventsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const search = query.search.trim();
      where.title = { contains: search, mode: 'insensitive' };
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
   * Create a new event
   */
  static async createEvent(
    data: {
      title: string;
      description: string;
      shortDesc?: string;
      startDate: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      isAllDay?: boolean;
      venue?: string;
      address?: string;
      cityId?: string;
      mapUrl?: string;
      isOnline?: boolean;
      meetingLink?: string;
      coverImageUrl?: string;
      isPublic?: boolean;
      maxAttendees?: number;
    },
    adminUserId: string,
  ) {
    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        shortDesc: data.shortDesc,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        isAllDay: data.isAllDay ?? false,
        venue: data.venue,
        address: data.address,
        cityId: data.cityId,
        mapUrl: data.mapUrl,
        isOnline: data.isOnline ?? false,
        meetingLink: data.meetingLink,
        coverImageUrl: data.coverImageUrl,
        isPublic: data.isPublic ?? true,
        maxAttendees: data.maxAttendees,
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
      venue?: string;
      address?: string;
      cityId?: string;
      mapUrl?: string;
      isOnline?: boolean;
      meetingLink?: string;
      coverImageUrl?: string;
      isPublic?: boolean;
      maxAttendees?: number;
    },
    adminUserId: string,
  ) {
    const event = await prisma.event.update({
      where: { id },
      data,
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

    return { success: true };
  }

  /**
   * Get all RSVPs for an event (for CSV export)
   */
  static async getEventRegistrations(eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });

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
      },
    });

    return { event, registrations };
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
      imageUrl?: string;
      attachmentUrl?: string;
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
      expiresAt?: Date;
      imageUrl?: string;
      attachmentUrl?: string;
    },
    adminUserId: string,
  ) {
    const notice = await prisma.notice.update({
      where: { id },
      data,
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

    return notice;
  }

  /**
   * Publish a notice
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

    const where: any = {};

    if (query.search) {
      const search = query.search.trim();
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { photos: true } },
        },
      }),
    ]);

    return {
      albums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new album
   */
  static async createAlbum(
    data: {
      title: string;
      description?: string;
      coverImageUrl?: string;
      isPublished?: boolean;
    },
    adminUserId: string,
  ) {
    const album = await prisma.album.create({
      data: {
        title: data.title,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
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
        metadata: { title: album.title },
      },
    });

    return album;
  }

  /**
   * Update an existing album
   */
  static async updateAlbum(
    id: string,
    data: {
      title?: string;
      description?: string;
      coverImageUrl?: string;
      isPublished?: boolean;
    },
    adminUserId: string,
  ) {
    const album = await prisma.album.update({
      where: { id },
      data,
      include: { _count: { select: { photos: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_UPDATED',
        entity: 'Album',
        entityId: id,
        metadata: { title: album.title },
      },
    });

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

    return { success: true };
  }

  /**
   * Add photos to an album
   */
  static async addPhotosToAlbum(
    albumId: string,
    photos: { imageUrl: string; thumbnailUrl?: string; caption?: string; sortOrder?: number }[],
    adminUserId: string,
  ) {
    const album = await prisma.album.findUnique({ where: { id: albumId } });

    if (!album) {
      throw new AppError('Album not found', 404);
    }

    const created = await prisma.albumPhoto.createMany({
      data: photos.map((photo) => ({
        albumId,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        sortOrder: photo.sortOrder ?? 0,
      })),
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ALBUM_PHOTOS_ADDED',
        entity: 'Album',
        entityId: albumId,
        metadata: { albumTitle: album.title, photoCount: photos.length },
      },
    });

    return { count: created.count };
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

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'PHOTO_DELETED',
        entity: 'AlbumPhoto',
        entityId: photoId,
        metadata: { albumId: photo.albumId },
      },
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ═══════════════════════════════════════════════════════════

  /**
   * List audit logs with pagination, entity filter, userId filter, date range
   */
  static async listAuditLogs(query: ListAuditLogsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Attach user info (email, fullName) since AuditLog has no relation to User
    const userIds = Array.from(new Set(logs.map((log) => log.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const logsWithUser = logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) || null,
    }));

    return {
      logs: logsWithUser,
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
   * Update multiple app settings at once
   */
  static async updateSettings(
    settings: { key: string; value: string }[],
    adminUserId: string,
  ) {
    const results = await Promise.all(
      settings.map((s) =>
        prisma.appSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'SETTINGS_UPDATED',
        entity: 'AppSetting',
        metadata: { keys: settings.map((s) => s.key) },
      },
    });

    return results;
  }
}
