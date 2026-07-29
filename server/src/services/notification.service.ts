import { prisma } from '../utils/prisma';
import { NotificationStatus, NotificationChannel } from '@prisma/client';

export class NotificationService {
  static async registerPushToken(userId: string, token: string, platform: string = 'android') {
    if (!token) return null;

    // 1. Update on user profile
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });

    // 2. Save in PushToken table
    return prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform: platform || 'android', isActive: true, updatedAt: new Date() },
      create: { userId, token, platform: platform || 'android', isActive: true },
    });
  }

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

  /**
   * Broadcast notice to all active users (creating in-app notifications + Expo Push)
   */
  static async broadcastNoticeNotification(noticeId: string, title: string, content: string, extraData: object = {}) {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, expoPushToken: true },
    });

    if (activeUsers.length === 0) return { count: 0 };

    // 1. Bulk create in-app notification rows
    const notificationData = activeUsers.map((user) => ({
      userId: user.id,
      title,
      body: content.substring(0, 160),
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
      data: { noticeId, ...extraData },
      sentAt: new Date(),
    }));

    await prisma.notification.createMany({
      data: notificationData,
    });

    // 2. Send Expo Push Notifications to registered push tokens
    const pushTokens = activeUsers
      .map((u) => u.expoPushToken)
      .filter((t): t is string => Boolean(t && t.startsWith('ExponentPushToken')));

    if (pushTokens.length > 0) {
      void this.sendExpoPushBatch(pushTokens, title, content, { noticeId, ...extraData });
    }

    return { count: activeUsers.length };
  }

  /**
   * Send Expo Push Notification payload directly via fetch to Expo HTTP API
   */
  static async sendExpoPushBatch(tokens: string[], title: string, body: string, data: object = {}) {
    try {
      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body: body.substring(0, 160),
        data,
        priority: 'high',
        channelId: 'default',
      }));

      // Expo Push API accepts batch arrays of up to 100 messages
      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
      }
    } catch (err) {
      console.error('[EXPO PUSH ERROR]', err);
    }
  }
}
