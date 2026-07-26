import { prisma } from '../utils/prisma';
import { NotificationStatus } from '@prisma/client';

export class NotificationService {
  static async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, status: { not: NotificationStatus.READ } },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        status: { not: NotificationStatus.READ },
      },
    });
  }
}
