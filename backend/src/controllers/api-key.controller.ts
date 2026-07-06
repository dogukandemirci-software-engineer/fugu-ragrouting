import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ApiKeyService } from '../services/api-key.service';
import { asyncHandler } from '../middlewares/async-handler';

export const ApiKeyController = {
  list: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const keys = await ApiKeyService.list(req.user!.orgId);
    res.json({ keys });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const result = await ApiKeyService.create({
      orgId: req.user!.orgId,
      userId: req.user!.id,
      name: req.body.name,
      permissions: req.body.permissions,
      expires_at: req.body.expires_at,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    // Raw key only returned once at creation — not stored
    res.status(201).json(result);
  }),

  revoke: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await ApiKeyService.revoke({
      id: req.params.id,
      orgId: req.user!.orgId,
      userId: req.user!.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  }),
};
