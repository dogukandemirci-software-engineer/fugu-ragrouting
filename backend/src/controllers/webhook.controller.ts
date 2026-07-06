import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { WebhookService } from '../services/webhook.service';
import { asyncHandler } from '../middlewares/async-handler';

export const WebhookController = {
  list: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const webhooks = await WebhookService.list(req.user!.orgId);
    res.json({ webhooks });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const result = await WebhookService.create({
      orgId: req.user!.orgId,
      userId: req.user!.id,
      name: req.body.name,
      url: req.body.url,
      events: req.body.events,
    });
    res.status(201).json(result);
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await WebhookService.delete(req.params.id, req.user!.orgId);
    res.status(204).end();
  }),
};
