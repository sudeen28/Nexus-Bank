import { prisma } from '../prisma/client';
import { AppError, NotFoundError } from '../common/errors';
import { checkFraud } from './fraud.service';
import { sendEmail, emailTemplates } from '../common/email.service';
import { createNotification } from '../notifications/notifications.service';
import Stripe from 'stripe';
import { config } from '../config';
import { v4 as uuid } from 'uuid';

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });

interface TransferDto {
  senderAccountId: string;
  receiverAccountNumber: string;
  amount: number;
  description?: string;
  userId: string;
}

interface DepositDto {
  accountId: string;
  amount: number;
  userId: string;
  stripePaymentMethodId: string;
}

interface WithdrawalDto {
  accountId: string;
  amount: number;
  userId: string;
  description?: string;
}

interface ListTransactionsDto {
  userId: string;
  accountId?: string;
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function transfer(dto: TransferDto) {
  const senderAccount = await prisma.account.findFirst({
    where: { id: dto.senderAccountId, userId: dto.userId },
    include: { user: true },
  });
  if (!senderAccount) throw new NotFoundError('Sender account not found');
  if (senderAccount.isFrozen) throw new AppError('Account is frozen', 403, 'ACCOUNT_FROZEN');
  if (Number(senderAccount.balance) < dto.amount) throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
  if (dto.amount <= 0) throw new AppError('Amount must be positive', 400, 'INVALID_AMOUNT');
  if (dto.amount < 0.01) throw new AppError('Minimum transfer amount is $0.01', 400, 'BELOW_MINIMUM');

  const receiverAccount = await prisma.account.findUnique({
    where: { accountNumber: dto.receiverAccountNumber },
    include: { user: true },
  });
  if (!receiverAccount) throw new NotFoundError('Recipient account not found');
  if (receiverAccount.id === senderAccount.id) throw new AppError('Cannot transfer to same account', 400, 'SAME_ACCOUNT');
  if (receiverAccount.isFrozen) throw new AppError('Recipient account is frozen', 400, 'RECIPIENT_FROZEN');

  // Fraud check
  const fraud = await checkFraud({
    userId: dto.userId,
    accountId: senderAccount.id,
    amount: dto.amount,
    type: 'TRANSFER_OUT',
  });

  const fee = dto.amount >= 1000 ? 0.5 : 0;
  const totalDebit = dto.amount + fee;

  const result = await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: senderAccount.id },
      data: {
        balance: { decrement: totalDebit },
        availableBalance: { decrement: totalDebit },
      },
    });
    await tx.account.update({
      where: { id: receiverAccount.id },
      data: {
        balance: { increment: dto.amount },
        availableBalance: { increment: dto.amount },
      },
    });

    const outTx = await tx.transaction.create({
      data: {
        referenceId: uuid(),
        senderAccountId: senderAccount.id,
        type: 'TRANSFER_OUT',
        status: fraud.flagged ? 'FLAGGED' : 'COMPLETED',
        amount: dto.amount,
        fee,
        description: dto.description || `Transfer to ${receiverAccount.user.firstName} ${receiverAccount.user.lastName}`,
        isFlagged: fraud.flagged,
        flagReason: fraud.reason,
        processedAt: fraud.flagged ? null : new Date(),
        metadata: { receiverAccountNumber: dto.receiverAccountNumber },
      },
    });

    await tx.transaction.create({
      data: {
        referenceId: uuid(),
        receiverAccountId: receiverAccount.id,
        type: 'TRANSFER_IN',
        status: fraud.flagged ? 'FLAGGED' : 'COMPLETED',
        amount: dto.amount,
        fee: 0,
        description: dto.description || `Transfer from ${senderAccount.user.firstName} ${senderAccount.user.lastName}`,
        isFlagged: fraud.flagged,
        flagReason: fraud.reason,
        processedAt: fraud.flagged ? null : new Date(),
        metadata: { senderAccountNumber: senderAccount.accountNumber },
      },
    });

    return outTx;
  });

  // Notifications
  const newBalance = Number(senderAccount.balance) - totalDebit;
  await Promise.all([
    createNotification(dto.userId, 'TRANSACTION',
      fraud.flagged ? '⚠️ Transfer Flagged for Review' : '✅ Transfer Successful',
      fraud.flagged
        ? `Your transfer of $${dto.amount.toFixed(2)} has been flagged for security review.`
        : `$${dto.amount.toFixed(2)} sent successfully.`
    ),
    createNotification(receiverAccount.user.id, 'TRANSACTION', '💰 Money Received',
      `You received $${dto.amount.toFixed(2)} from ${senderAccount.user.firstName} ${senderAccount.user.lastName}.`
    ),
    sendEmail({
      to: senderAccount.user.email,
      ...emailTemplates.transactionAlert(
        senderAccount.user.firstName,
        'TRANSFER_OUT',
        dto.amount.toFixed(2),
        newBalance.toFixed(2)
      ),
    }),
  ]);

  return result;
}

export async function deposit(dto: DepositDto) {
  const account = await prisma.account.findFirst({
    where: { id: dto.accountId, userId: dto.userId },
    include: { user: true },
  });
  if (!account) throw new NotFoundError('Account not found');
  if (account.isFrozen) throw new AppError('Account is frozen', 403, 'ACCOUNT_FROZEN');
  if (dto.amount < 1) throw new AppError('Minimum deposit is $1.00', 400, 'BELOW_MINIMUM');

  // Stripe payment intent
  let stripePaymentId: string | undefined;
  if (config.stripe.secretKey && config.stripe.secretKey !== 'sk_test_YOUR_STRIPE_SECRET_KEY') {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(dto.amount * 100),
      currency: 'usd',
      payment_method: dto.stripePaymentMethodId,
      confirm: true,
      return_url: `${config.frontendUrl}/dashboard`,
    });
    stripePaymentId = paymentIntent.id;
    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment failed. Please try again.', 400, 'PAYMENT_FAILED');
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: account.id },
      data: {
        balance: { increment: dto.amount },
        availableBalance: { increment: dto.amount },
      },
    });
    return tx.transaction.create({
      data: {
        referenceId: uuid(),
        receiverAccountId: account.id,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        amount: dto.amount,
        fee: 0,
        description: 'Card Deposit via Stripe',
        stripePaymentId,
        processedAt: new Date(),
      },
    });
  });

  await createNotification(dto.userId, 'TRANSACTION', '✅ Deposit Successful',
    `$${dto.amount.toFixed(2)} deposited to your account.`
  );

  return result;
}

export async function withdraw(dto: WithdrawalDto) {
  const account = await prisma.account.findFirst({
    where: { id: dto.accountId, userId: dto.userId },
    include: { user: true },
  });
  if (!account) throw new NotFoundError('Account not found');
  if (account.isFrozen) throw new AppError('Account is frozen', 403, 'ACCOUNT_FROZEN');
  if (Number(account.balance) < dto.amount) throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
  if (dto.amount <= 0) throw new AppError('Amount must be positive', 400, 'INVALID_AMOUNT');

  const fraud = await checkFraud({
    userId: dto.userId,
    accountId: account.id,
    amount: dto.amount,
    type: 'WITHDRAWAL',
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: account.id },
      data: {
        balance: { decrement: dto.amount },
        availableBalance: { decrement: dto.amount },
      },
    });
    return tx.transaction.create({
      data: {
        referenceId: uuid(),
        senderAccountId: account.id,
        type: 'WITHDRAWAL',
        status: fraud.flagged ? 'FLAGGED' : 'COMPLETED',
        amount: dto.amount,
        fee: 0,
        description: dto.description || 'Withdrawal',
        isFlagged: fraud.flagged,
        flagReason: fraud.reason,
        processedAt: fraud.flagged ? null : new Date(),
      },
    });
  });

  await createNotification(dto.userId, 'TRANSACTION',
    fraud.flagged ? '⚠️ Withdrawal Flagged' : '💸 Withdrawal Processed',
    `$${dto.amount.toFixed(2)} withdrawal ${fraud.flagged ? 'flagged for review' : 'processed successfully'}.`
  );

  return result;
}

export async function getTransactions(dto: ListTransactionsDto) {
  const page = dto.page || 1;
  const limit = Math.min(dto.limit || 20, 100);
  const skip = (page - 1) * limit;

  // Get user's account IDs
  const accounts = await prisma.account.findMany({
    where: { userId: dto.userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);
  if (dto.accountId && !accountIds.includes(dto.accountId)) {
    throw new AppError('Account not found', 404);
  }
  const targetIds = dto.accountId ? [dto.accountId] : accountIds;

  const where: any = {
    OR: [
      { senderAccountId: { in: targetIds } },
      { receiverAccountId: { in: targetIds } },
    ],
  };

  if (dto.type) where.type = dto.type;
  if (dto.status) where.status = dto.status;
  if (dto.startDate || dto.endDate) {
    where.createdAt = {};
    if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
    if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
  }
  if (dto.search) {
    where.OR = [
      ...where.OR,
      { description: { contains: dto.search, mode: 'insensitive' } },
      { referenceId: { contains: dto.search, mode: 'insensitive' } },
    ];
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        senderAccount: { include: { user: { select: { firstName: true, lastName: true } } } },
        receiverAccount: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  return { transactions, total, page, limit };
}

export async function getTransactionById(txId: string, userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
  const accountIds = accounts.map((a) => a.id);

  const tx = await prisma.transaction.findFirst({
    where: {
      id: txId,
      OR: [{ senderAccountId: { in: accountIds } }, { receiverAccountId: { in: accountIds } }],
    },
    include: {
      senderAccount: { include: { user: { select: { firstName: true, lastName: true } } } },
      receiverAccount: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!tx) throw new NotFoundError('Transaction not found');
  return tx;
}

export async function createStripePaymentIntent(amount: number, userId: string) {
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: { userId },
  });
  return { clientSecret: intent.client_secret, id: intent.id };
}
