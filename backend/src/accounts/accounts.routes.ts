import { Router, Request, Response } from 'express';
import * as accountsService from './accounts.service';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, asyncHandler } from '../common/response';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await accountsService.getAccounts(req.user!.sub);
  successResponse(res, accounts);
}));

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await accountsService.getAccountStats(req.user!.sub);
  successResponse(res, stats);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const account = await accountsService.getAccountById(req.params.id, req.user!.sub);
  successResponse(res, account);
}));

router.post('/:id/freeze', asyncHandler(async (req: Request, res: Response) => {
  const account = await accountsService.freezeAccount(req.params.id, req.user!.sub);
  successResponse(res, account, 'Account frozen');
}));

router.post('/:id/unfreeze', asyncHandler(async (req: Request, res: Response) => {
  const account = await accountsService.unfreezeAccount(req.params.id, req.user!.sub);
  successResponse(res, account, 'Account unfrozen');
}));

export default router;
