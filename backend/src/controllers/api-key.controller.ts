import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiKeyService } from '../services/api-key.service';

export const ApiKeyController = {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const keys = await ApiKeyService.list(req.user!.orgId);
      res.json({ keys });
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ApiKeyService.create({
        orgId: req.user!.orgId,
        userId: req.user!.id,
        name: req.body.name,
        permissions: req.body.permissions,
        expires_at: req.body.expires_at,
      });
      // Raw key only returned once at creation — not stored
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async revoke(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await ApiKeyService.revoke({
        id: req.params.id,
        orgId: req.user!.orgId,
        userId: req.user!.id,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
