import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as cardsService from './cards.service';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, asyncHandler } from '../common/response';

const router = Router();
router.use(authenticate);

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = z.object({ accountId: z.string().uuid().optional() }).parse(req.body);
  const card = await cardsService.createCard(req.user!.sub, accountId);
  successResponse(res, card, 'Virtual card created', 201);
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const cards = await cardsService.getCards(req.user!.sub);
  successResponse(res, cards);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const card = await cardsService.getCardDetails(req.params.id, req.user!.sub);
  successResponse(res, card);
}));

router.post('/:id/freeze', asyncHandler(async (req: Request, res: Response) => {
  const card = await cardsService.freezeCard(req.params.id, req.user!.sub);
  successResponse(res, card, 'Card frozen');
}));

router.post('/:id/unfreeze', asyncHandler(async (req: Request, res: Response) => {
  const card = await cardsService.unfreezeCard(req.params.id, req.user!.sub);
  successResponse(res, card, 'Card activated');
}));

router.post('/:id/cancel', asyncHandler(async (req: Request, res: Response) => {
  const card = await cardsService.cancelCard(req.params.id, req.user!.sub);
  successResponse(res, card, 'Card cancelled');
}));

router.patch('/:id/limit', asyncHandler(async (req: Request, res: Response) => {
  const { dailyLimit } = z.object({ dailyLimit: z.number().min(1).max(10000) }).parse(req.body);
  const card = await cardsService.updateCardLimit(req.params.id, req.user!.sub, dailyLimit);
  successResponse(res, card, 'Card limit updated');
}));

export default router;
