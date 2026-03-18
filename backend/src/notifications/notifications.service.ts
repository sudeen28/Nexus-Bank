import { prisma } from '../prisma/client';
import { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: any
) {
  return prisma.notification.create({
    data: { userId, type, title, message, metadata },
  });
}

export async function getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
  const skip = (page - 1) * limit;
  const where: any = { userId };
  if (unreadOnly) where.isRead = false;

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount, page, limit };
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  return prisma.notification.deleteMany({ where: { id: notificationId, userId } });
}
