import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { UnauthorizedError } from '../utils/errors';
import { AuthRequest } from './auth.middleware';
import { orgScopeMiddleware } from './org-scope.middleware';

export async function requireApiKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const key = header?.startsWith('Bearer fugu_sk_') ? header.slice(7) : null;

  if (!key) {
    return next(new UnauthorizedError('Missing or invalid API key'));
  }

  const result = await ApiKeyService.authenticate(key);
  if (!result) {
    return next(new UnauthorizedError('Invalid, expired, or revoked API key'));
  }

  // Attach minimal context so downstream handlers can filter by org
  req.user = { id: 'api_key', orgId: result.orgId, role: 'api_key', email: '' };
  await orgScopeMiddleware(req, res, next);
}
