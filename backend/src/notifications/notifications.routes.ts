import { Router, Request, Response } from 'express';
import * as notifService from './notifications.service';
import { authenticate } from '../common/guards/auth.middleware';
import { successResponse, paginatedResponse, asyncHandler } from '../common/response';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unreadOnly === 'true';
  const result = await notifService.getNotifications(req.user!.sub, page, limit, unreadOnly);
  res.json({
    success: true,
    data: result.notifications,
    unreadCount: result.unreadCount,
    pagination: { total: result.total, page: result.page, limit: result.limit },
  });
}));

router.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  await notifService.markAsRead(req.params.id, req.user!.sub);
  successResponse(res, null, 'Notification marked as read');
}));

router.patch('/read-all', asyncHandler(async (req: Request, res: Response) => {
  await notifService.markAllAsRead(req.user!.sub);
  successResponse(res, null, 'All notifications marked as read');
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await notifService.deleteNotification(req.params.id, req.user!.sub);
  successResponse(res, null, 'Notification deleted');
}));

export default router;
