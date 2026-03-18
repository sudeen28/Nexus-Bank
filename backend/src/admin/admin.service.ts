import { prisma } from '../prisma/client';
import { NotFoundError, AppError } from '../common/errors';
import { sendEmail } from '../common/email.service';

export async function getDashboardStats() {
  const [
    totalUsers, activeUsers, totalTransactions,
    flaggedTransactions, pendingKyc,
    volumeResult, revenueResult,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { isFlagged: true } }),
    prisma.kycDocument.count({ where: { status: 'PENDING' } }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { fee: true },
    }),
  ]);

  // Recent signups per day (last 7 days)
  const signupTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    const count = await prisma.user.count({ where: { createdAt: { gte: start, lte: end } } });
    signupTrend.push({ date: start.toLocaleDateString('en', { weekday: 'short' }), count });
  }

  return {
    totalUsers,
    activeUsers,
    totalTransactions,
    flaggedTransactions,
    pendingKyc,
    totalVolume: Number(volumeResult._sum.amount || 0),
    totalRevenue: Number(revenueResult._sum.fee || 0),
    signupTrend,
  };
}

export async function listUsers(page = 1, limit = 20, search?: string, status?: string, role?: string) {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, status: true, emailVerified: true,
        createdAt: true, lastLoginAt: true,
        accounts: { select: { balance: true, accountNumber: true } },
        kyc: { select: { status: true } },
      },
    }),
  ]);

  return { users, total, page, limit };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      cards: { select: { id: true, maskedNumber: true, status: true, cardType: true, createdAt: true } },
      kyc: true,
      notifications: { take: 5, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!user) throw new NotFoundError('User not found');
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

export async function updateUserStatus(userId: string, status: string, adminId: string, reason?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  const validStatuses = ['ACTIVE', 'SUSPENDED', 'FROZEN', 'PENDING_VERIFICATION'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: status as any },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: `USER_STATUS_CHANGED_TO_${status}`,
      entity: 'User',
      entityId: userId,
      metadata: { reason, previousStatus: user.status },
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'SECURITY',
      title: `Account Status Updated`,
      message: `Your account status has been changed to ${status}. ${reason ? `Reason: ${reason}` : ''}`,
    },
  });

  return updated;
}

export async function reviewKyc(kycId: string, adminId: string, approved: boolean, rejectionReason?: string) {
  const kyc = await prisma.kycDocument.findUnique({ where: { id: kycId } });
  if (!kyc) throw new NotFoundError('KYC document not found');
  if (kyc.status !== 'PENDING') throw new AppError('KYC not in pending state', 400);

  const updated = await prisma.kycDocument.update({
    where: { id: kycId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectionReason: approved ? null : rejectionReason,
    },
  });

  await prisma.notification.create({
    data: {
      userId: kyc.userId,
      type: 'KYC',
      title: approved ? '✅ Identity Verified' : '❌ KYC Rejected',
      message: approved
        ? 'Congratulations! Your identity has been verified. You now have full access.'
        : `Your KYC was rejected. Reason: ${rejectionReason || 'Documents unclear'}. Please resubmit.`,
    },
  });

  return updated;
}

export async function getFlaggedTransactions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where: { isFlagged: true } }),
    prisma.transaction.findMany({
      where: { isFlagged: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        senderAccount: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        receiverAccount: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    }),
  ]);
  return { transactions, total, page, limit };
}

export async function resolveTransaction(txId: string, adminId: string, action: 'APPROVE' | 'REVERSE') {
  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) throw new NotFoundError('Transaction not found');

  await prisma.transaction.update({
    where: { id: txId },
    data: {
      isFlagged: false,
      status: action === 'APPROVE' ? 'COMPLETED' : 'REVERSED',
      processedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: `TRANSACTION_${action}D`,
      entity: 'Transaction',
      entityId: txId,
    },
  });
}

export async function getAdminTransactions(page = 1, limit = 20, status?: string) {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        senderAccount: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        receiverAccount: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    }),
  ]);
  return { transactions, total, page, limit };
}
