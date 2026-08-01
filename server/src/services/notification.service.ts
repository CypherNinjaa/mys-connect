import { prisma } from '../utils/prisma';
import { NotificationStatus, NotificationChannel } from '@prisma/client';
import { emitNotificationToUsers } from '../socket/emitters';

export class NotificationService {
  /**
   * Bind an Expo push token to a user, taking it away from whoever held it.
   *
   * A phone can be shared or re-used, so the same token can arrive for a second
   * account. Broadcasts read `User.expoPushToken`, so unless the previous owner
   * is cleared first they keep receiving the new member's notifications.
   */
  static async registerPushToken(userId: string, token: string, platform: string = 'android') {
    if (!token) return null;

    return prisma.$transaction(async (tx) => {
      // Detach the device from every other account before claiming it.
      await tx.user.updateMany({
        where: { expoPushToken: token, id: { not: userId } },
        data: { expoPushToken: null },
      });

      await tx.pushToken.updateMany({
        where: { token, userId: { not: userId } },
        data: { isActive: false },
      });

      await tx.user.update({
        where: { id: userId },
        data: { expoPushToken: token },
      });

      return tx.pushToken.upsert({
        where: { token },
        update: { userId, platform: platform || 'android', isActive: true, updatedAt: new Date() },
        create: { userId, token, platform: platform || 'android', isActive: true },
      });
    });
  }

  /**
   * Release a push token on sign-out so the device stops receiving this
   * member's notifications while another account uses it.
   */
  static async unregisterPushToken(userId: string, token: string) {
    if (!token) return null;

    return prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, expoPushToken: token },
        data: { expoPushToken: null },
      });

      return tx.pushToken.updateMany({
        where: { token, userId },
        data: { isActive: false, updatedAt: new Date() },
      });
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
   * Broadcast notice to all active users (in-app notifications + Expo Push)
   */
  static async broadcastNoticeNotification(noticeId: string, title: string, content: string, extraData: object = {}) {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, expoPushToken: true },
    });

    if (activeUsers.length === 0) return { count: 0 };

    const notificationData = activeUsers.map((user) => ({
      userId: user.id,
      title,
      body: content.substring(0, 160),
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
      data: { noticeId, type: 'NOTICE', ...extraData },
      sentAt: new Date(),
    }));

    await prisma.notification.createMany({ data: notificationData });

    const pushTokens = activeUsers
      .map((u) => u.expoPushToken)
      .filter((t): t is string => Boolean(t && t.startsWith('ExponentPushToken')));

    const willPush = pushTokens.length > 0;

    // Realtime first: a member with the app open sees this immediately, and the
    // `alsoPushed` flag tells that client to suppress the push banner for the
    // same notice so it is not announced twice.
    emitNotificationToUsers(
      activeUsers.map((u) => u.id),
      {
        title,
        body: content.substring(0, 160),
        data: { noticeId, type: 'NOTICE', ...extraData },
        alsoPushed: willPush,
      },
    );

    if (willPush) {
      void this.sendExpoPushBatch(pushTokens, title, content, {
        noticeId,
        type: 'NOTICE',
        channelId: 'notices',
        ...extraData,
      });
    }

    return { count: activeUsers.length };
  }

  /**
   * Broadcast event notification to specific users or all active users
   */
  static async broadcastEventNotification(
    eventId: string,
    title: string,
    body: string,
    extraData: object = {},
    targetUserIds?: string[]
  ) {
    const whereClause = targetUserIds
      ? { id: { in: targetUserIds }, status: 'ACTIVE' as const }
      : { status: 'ACTIVE' as const };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, expoPushToken: true },
    });

    if (users.length === 0) return { count: 0 };

    // Dedup check — prevent duplicate notifications within 5 minutes
    const recentDuplicate = await prisma.notification.findFirst({
      where: {
        data: { path: ['eventId'], equals: eventId },
        sentAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    if (recentDuplicate) return { count: 0, skipped: 'duplicate' };

    const notificationData = users.map((user) => ({
      userId: user.id,
      title,
      body: body.substring(0, 160),
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
      data: { eventId, type: 'EVENT', ...extraData },
      sentAt: new Date(),
    }));

    await prisma.notification.createMany({ data: notificationData });

    const pushTokens = users
      .map((u) => u.expoPushToken)
      .filter((t): t is string => Boolean(t && t.startsWith('ExponentPushToken')));

    const willPush = pushTokens.length > 0;

    // See broadcastNoticeNotification — socket frame carries `alsoPushed` so a
    // foregrounded client shows this once, not twice.
    emitNotificationToUsers(
      users.map((u) => u.id),
      {
        title,
        body: body.substring(0, 160),
        data: { eventId, type: 'EVENT', ...extraData },
        alsoPushed: willPush,
      },
    );

    if (willPush) {
      void this.sendExpoPushBatch(pushTokens, title, body, {
        eventId,
        type: 'EVENT',
        channelId: 'events',
        ...extraData,
      });
    }

    return { count: users.length };
  }

  /**
   * Send Expo Push Notifications via the Expo HTTP API.
   * Handles batching, receipt checking, and invalid token cleanup.
   */
  static async sendExpoPushBatch(tokens: string[], title: string, body: string, data: object = {}) {
    const allTicketIds: string[] = [];

    try {
      const channelId = (data as any).channelId || 'default';
      const messages = tokens.map((token) => ({
        to: token,
        sound: 'default' as const,
        title,
        body: body.substring(0, 160),
        data,
        priority: 'high' as const,
        channelId,
      }));

      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);

        try {
          const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });

          const result = (await res.json()) as any;
          if (result.data) {
            for (const ticket of result.data) {
              if (ticket.id) allTicketIds.push(ticket.id);
            }
          }
        } catch (err) {
          console.error('[EXPO PUSH] Chunk send failed, retrying once...', err);
          // Retry once after 2 seconds
          await new Promise((r) => setTimeout(r, 2000));
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(chunk),
            });
          } catch (retryErr) {
            console.error('[EXPO PUSH] Retry also failed:', retryErr);
          }
        }
      }
    } catch (err) {
      console.error('[EXPO PUSH ERROR]', err);
    }

    // Check receipts after 15 seconds to deactivate invalid tokens
    if (allTicketIds.length > 0) {
      setTimeout(() => {
        void this.checkPushReceipts(allTicketIds);
      }, 15000);
    }
  }

  /**
   * Check Expo push receipts and deactivate invalid tokens
   */
  private static async checkPushReceipts(ticketIds: string[]) {
    try {
      const chunkSize = 100;
      for (let i = 0; i < ticketIds.length; i += chunkSize) {
        const chunk = ticketIds.slice(i, i + chunkSize);
        const res = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: chunk }),
        });

        const result = (await res.json()) as any;
        if (!result.data) continue;

        for (const [, receipt] of Object.entries(result.data) as [string, any][]) {
          if (
            receipt.status === 'error' &&
            receipt.details?.error === 'DeviceNotRegistered'
          ) {
            // Deactivate the invalid token
            const token = receipt.expoPushToken;
            if (token) {
              await prisma.pushToken.updateMany({
                where: { token },
                data: { isActive: false },
              });
              await prisma.user.updateMany({
                where: { expoPushToken: token },
                data: { expoPushToken: null },
              });
              console.log('[EXPO PUSH] Deactivated invalid token:', token);
            }
          }
        }
      }
    } catch (err) {
      console.error('[EXPO PUSH] Receipt check failed:', err);
    }
  }
}
