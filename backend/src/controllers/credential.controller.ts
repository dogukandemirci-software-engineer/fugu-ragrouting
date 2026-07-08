import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CredentialService } from '../services/credential.service';
import { asyncHandler } from '../middlewares/async-handler';
import { isValidLLMCredential } from '../config/llm-credential-models';
import { ValidationError } from '../utils/errors';

export const CredentialController = {
  get: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const credential = await CredentialService.getDisplay(req.user!.orgId);
    res.json({ credential });
  }),

  save: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { provider, model, apiKey } = req.body;
    if (!isValidLLMCredential(provider, model)) {
      throw new ValidationError(`Unsupported provider/model combination: ${provider}/${model}`);
    }
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new ValidationError('apiKey is required');
    }
    const credential = await CredentialService.save(req.user!.orgId, provider, model, apiKey.trim());
    res.json({ credential });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await CredentialService.remove(req.user!.orgId);
    res.status(204).end();
  }),
};
