import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { WebhookService } from '../services/webhook.service';

export const WebhookController = {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const webhooks = await WebhookService.list(req.user!.orgId);
      res.json({ webhooks });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await WebhookService.create({
        orgId: req.user!.orgId,
        userId: req.user!.id,
        name: req.body.name,
        url: req.body.url,
        events: req.body.events,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await WebhookService.delete(req.params.id, req.user!.orgId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
