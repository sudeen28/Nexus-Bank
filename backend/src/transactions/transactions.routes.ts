import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as txService from './transactions.service';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, paginatedResponse, asyncHandler } from '../common/response';
import { config } from '../config';
import Stripe from 'stripe';
import { prisma } from '../prisma/client';

const router = Router();
router.use(authenticate);

const stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2023-10-16' });

const transferSchema = z.object({
  senderAccountId: z.string().uuid(),
  receiverAccountNumber: z.string().min(10).max(10),
  amount: z.number().positive().min(0.01),
  description: z.string().max(200).optional(),
});

const depositSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().min(1).max(50000),
  stripePaymentMethodId: z.string().default('pm_card_visa'),
});

const withdrawSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
});

// POST /transactions/transfer
router.post('/transfer', asyncHandler(async (req: Request, res: Response) => {
  const dto = transferSchema.parse(req.body);
  const result = await txService.transfer({ ...dto, userId: req.user!.sub });
  successResponse(res, result, 'Transfer completed', 201);
}));

// POST /transactions/deposit
router.post('/deposit', asyncHandler(async (req: Request, res: Response) => {
  const dto = depositSchema.parse(req.body);
  const result = await txService.deposit({ ...dto, userId: req.user!.sub });
  successResponse(res, result, 'Deposit successful', 201);
}));

// POST /transactions/withdraw
router.post('/withdraw', asyncHandler(async (req: Request, res: Response) => {
  const dto = withdrawSchema.parse(req.body);
  const result = await txService.withdraw({ ...dto, userId: req.user!.sub });
  successResponse(res, result, 'Withdrawal processed', 201);
}));

// POST /transactions/payment-intent
router.post('/payment-intent', asyncHandler(async (req: Request, res: Response) => {
  const { amount } = z.object({ amount: z.number().min(1) }).parse(req.body);
  const result = await txService.createStripePaymentIntent(amount, req.user!.sub);
  successResponse(res, result);
}));

// GET /transactions
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { accountId, type, status, search, startDate, endDate, page, limit } = req.query;
  const result = await txService.getTransactions({
    userId: req.user!.sub,
    accountId: accountId as string,
    type: type as string,
    status: status as string,
    search: search as string,
    startDate: startDate as string,
    endDate: endDate as string,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  });
  paginatedResponse(res, result.transactions, result.total, result.page, result.limit);
}));

// GET /transactions/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tx = await txService.getTransactionById(req.params.id, req.user!.sub);
  successResponse(res, tx);
}));

// POST /transactions/webhook (Stripe)
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch {
    return res.status(400).send('Webhook signature invalid');
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await prisma.transaction.updateMany({
      where: { stripePaymentId: pi.id },
      data: { status: 'COMPLETED', processedAt: new Date() },
    });
  }
  successResponse(res, { received: true });
}));

export default router;
