import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CredentialService } from '../services/credential.service';
import { ModelCatalogService } from '../services/model-catalog.service';
import { asyncHandler } from '../middlewares/async-handler';
import { ValidationError } from '../utils/errors';
import { LLMCredentialProvider } from '../entities/credential.entity';

const VALID_PROVIDERS: LLMCredentialProvider[] = ['anthropic', 'openai', 'gemini', 'openrouter', 'grok'];

export const CredentialController = {
  get: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const credential = await CredentialService.getDisplay(req.user!.orgId);
    res.json({ credential });
  }),

  listModels: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const provider = req.query.provider as string;
    if (!VALID_PROVIDERS.includes(provider as LLMCredentialProvider)) {
      throw new ValidationError(`Unknown provider: ${provider}`);
    }
    const models = await ModelCatalogService.getModels(provider as LLMCredentialProvider);
    res.json({ models });
  }),

  save: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const { provider, model, apiKey } = req.body;
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new ValidationError(`Unknown provider: ${provider}`);
    }
    if (!(await ModelCatalogService.isValidModel(provider, model))) {
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
