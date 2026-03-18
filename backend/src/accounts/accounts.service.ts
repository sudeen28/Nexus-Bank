import { prisma } from '../prisma/client';
import { NotFoundError, AppError } from '../common/errors';

export async function getAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { isDefault: 'desc' },
  });
}

export async function getAccountById(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new NotFoundError('Account not found');
  return account;
}

export async function getAccountStats(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const accountIds = accounts.map((a) => a.id);

  const [credits, debits, txCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        receiverAccountId: { in: accountIds },
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ['DEPOSIT', 'TRANSFER_IN'] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        senderAccountId: { in: accountIds },
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo },
        type: { in: ['WITHDRAWAL', 'TRANSFER_OUT', 'CARD_PAYMENT'] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.count({
      where: {
        OR: [{ senderAccountId: { in: accountIds } }, { receiverAccountId: { in: accountIds } }],
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  // Monthly spend for chart (last 6 months)
  const monthly = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [inc, exp] = await Promise.all([
      prisma.transaction.aggregate({
        where: { receiverAccountId: { in: accountIds }, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { senderAccountId: { in: accountIds }, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);
    monthly.push({
      month: start.toLocaleString('default', { month: 'short' }),
      income: Number(inc._sum.amount || 0),
      expenses: Number(exp._sum.amount || 0),
    });
  }

  return {
    totalBalance,
    monthlyIncome: Number(credits._sum.amount || 0),
    monthlyExpenses: Number(debits._sum.amount || 0),
    transactionCount: txCount,
    monthly,
    accounts,
  };
}

export async function freezeAccount(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new NotFoundError('Account not found');
  return prisma.account.update({ where: { id: accountId }, data: { isFrozen: true } });
}

export async function unfreezeAccount(accountId: string, userId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new NotFoundError('Account not found');
  return prisma.account.update({ where: { id: accountId }, data: { isFrozen: false } });
}
