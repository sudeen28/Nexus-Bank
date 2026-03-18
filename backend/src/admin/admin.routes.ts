import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as adminService from './admin.service';
import { authenticate, requireRole } from '../common/guards/auth.middleware';
import { successResponse, paginatedResponse, asyncHandler } from '../common/response';

const router = Router();
router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Dashboard
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getDashboardStats();
  successResponse(res, stats);
}));

// Users
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const { search, status, role } = req.query;
  const result = await adminService.listUsers(page, limit, search as string, status as string, role as string);
  paginatedResponse(res, result.users, result.total, result.page, result.limit);
}));

router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.getUserDetail(req.params.id);
  successResponse(res, user);
}));

router.patch('/users/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { status, reason } = z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'FROZEN', 'PENDING_VERIFICATION']),
    reason: z.string().optional(),
  }).parse(req.body);
  const user = await adminService.updateUserStatus(req.params.id, status, req.user!.sub, reason);
  successResponse(res, user, `User status updated to ${status}`);
}));

// Transactions
router.get('/transactions', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await adminService.getAdminTransactions(page, limit, req.query.status as string);
  paginatedResponse(res, result.transactions, result.total, result.page, result.limit);
}));

router.get('/transactions/flagged', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getFlaggedTransactions(page);
  paginatedResponse(res, result.transactions, result.total, result.page, result.limit);
}));

router.post('/transactions/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { action } = z.object({ action: z.enum(['APPROVE', 'REVERSE']) }).parse(req.body);
  await adminService.resolveTransaction(req.params.id, req.user!.sub, action);
  successResponse(res, null, `Transaction ${action.toLowerCase()}d`);
}));

// KYC
router.post('/kyc/:id/review', asyncHandler(async (req: Request, res: Response) => {
  const { approved, rejectionReason } = z.object({
    approved: z.boolean(),
    rejectionReason: z.string().optional(),
  }).parse(req.body);
  const kyc = await adminService.reviewKyc(req.params.id, req.user!.sub, approved, rejectionReason);
  successResponse(res, kyc, `KYC ${approved ? 'approved' : 'rejected'}`);
}));

export default router;
