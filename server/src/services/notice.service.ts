import { prisma } from '../utils/prisma';
import { NoticeType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export class NoticeService {
  static async getNotices(userId: string, category?: NoticeType) {
    const where: any = {
      isPublished: true,
    };

    if (category) {
      where.type = category;
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        noticeReads: {
          where: { userId },
        },
      },
    });

    return notices.map((notice) => ({
      ...notice,
      isRead: notice.noticeReads.length > 0,
      noticeReads: undefined,
    }));
  }

  static async getNoticeById(id: string, userId: string) {
    const notice = await prisma.notice.findUnique({
      where: { id },
    });

    if (!notice) throw new AppError('Notice not found', 404);

    // Mark as read automatically when viewed
    await prisma.noticeRead.upsert({
      where: {
        noticeId_userId: { noticeId: id, userId },
      },
      update: { readAt: new Date() },
      create: { noticeId: id, userId },
    });

    return {
      ...notice,
      isRead: true,
    };
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.noticeRead.upsert({
      where: {
        noticeId_userId: { noticeId: id, userId },
      },
      update: { readAt: new Date() },
      create: { noticeId: id, userId },
    });
  }
}
