import { prisma } from '../prisma/client';
import { NotFoundError, ConflictError } from '../common/errors';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      kyc: true,
      _count: { select: { notifications: { where: { isRead: false } } } },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

export async function updateProfile(userId: string, data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (data.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: { phone: data.phone, id: { not: userId } },
    });
    if (phoneExists) throw new ConflictError('Phone number already in use');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      address: true, city: true, country: true, dateOfBirth: true, avatar: true,
    },
  });

  return updated;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ConflictError('Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Revoke all refresh tokens on password change
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

export async function updateAvatar(userId: string, filePath: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  // Remove old avatar
  if (user.avatar) {
    const oldPath = path.join(process.cwd(), user.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await prisma.user.update({ where: { id: userId }, data: { avatar: filePath } });
  return { avatar: filePath };
}

export async function getActivityLog(userId: string) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
