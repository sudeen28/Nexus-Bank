import { prisma } from '../prisma/client';
import { logger } from '../common/logger';

interface FraudCheckInput {
  userId: string;
  accountId: string;
  amount: number;
  type: string;
  ipAddress?: string;
}

interface FraudResult {
  flagged: boolean;
  reason?: string;
  score: number;
}

export async function checkFraud(input: FraudCheckInput): Promise<FraudResult> {
  const reasons: string[] = [];
  let score = 0;

  const account = await prisma.account.findUnique({ where: { id: input.accountId } });
  if (!account) return { flagged: false, score: 0 };

  // Rule 1: Amount > daily limit
  if (input.amount > Number(account.dailyLimit)) {
    score += 40;
    reasons.push(`Amount $${input.amount} exceeds daily limit $${account.dailyLimit}`);
  }

  // Rule 2: Large single transaction (> $5000)
  if (input.amount > 5000) {
    score += 20;
    reasons.push('Large transaction amount (>$5,000)');
  }

  // Rule 3: Velocity — more than 5 transactions in 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.transaction.count({
    where: {
      OR: [{ senderAccountId: input.accountId }, { receiverAccountId: input.accountId }],
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentCount >= 5) {
    score += 30;
    reasons.push(`High velocity: ${recentCount} transactions in last hour`);
  }

  // Rule 4: Total spend in last 24h exceeds 80% of monthly limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailySpend = await prisma.transaction.aggregate({
    where: {
      senderAccountId: input.accountId,
      status: { in: ['COMPLETED', 'PENDING'] },
      createdAt: { gte: oneDayAgo },
    },
    _sum: { amount: true },
  });
  const spent = Number(dailySpend._sum.amount || 0) + input.amount;
  if (spent > Number(account.monthlyLimit) * 0.8) {
    score += 25;
    reasons.push('Daily spend approaching monthly limit');
  }

  // Rule 5: Transaction amount > 90% of current balance
  if (input.type !== 'DEPOSIT' && input.amount > Number(account.balance) * 0.9) {
    score += 15;
    reasons.push('Transaction consumes >90% of account balance');
  }

  const flagged = score >= 40;

  if (flagged) {
    logger.warn(`Fraud flag: userId=${input.userId}, score=${score}, reasons=${reasons.join('; ')}`);
  }

  return {
    flagged,
    score,
    reason: flagged ? reasons.join('; ') : undefined,
  };
}
