import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { UnauthorizedError } from '../utils/errors';
import { AuthRequest } from './auth.middleware';
import { orgScopeMiddleware } from './org-scope.middleware';
import { verifyAccessToken } from '../utils/token.util';

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

  // Attach minimal context so downstream handlers can filter by org, plus the
  // key's granted permissions so mutating routes can enforce 'write' scope.
  req.user = {
    id: 'api_key',
    orgId: result.orgId,
    role: 'api_key',
    email: '',
    apiKeyPermissions: result.permissions,
  };
  await orgScopeMiddleware(req, res, next);
}

/**
 * Gates a route on the caller's API key having `permission` in its granted
 * scopes. JWT-authenticated requests (role !== 'api_key') always pass, since
 * their access is governed by requireRole instead — this only restricts
 * API keys, so a key minted with only 'read' can't hit write endpoints.
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (req.user?.role !== 'api_key') return next();
    if (!req.user.apiKeyPermissions?.includes(permission)) {
      return next(new UnauthorizedError(`This API key does not have '${permission}' permission`));
    }
    next();
  };
}

/**
 * Accepts either a JWT (dashboard session) or a `fugu_sk_...` API key
 * (SDK/programmatic access). Tries JWT first since it's the cheaper,
 * synchronous check; falls back to the API-key lookup so both auth modes
 * can share the same route without duplicating handlers. Used on endpoints
 * that need to serve both the web dashboard and the SDK: streaming query,
 * document management, and BYOK credential management.
 */
export async function requireAuthOrApiKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization header'));
  }

  const token = header.slice(7);

  if (token.startsWith('fugu_sk_')) {
    return requireApiKey(req, res, next);
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, orgId: payload.orgId, role: payload.role, email: payload.email };
    await orgScopeMiddleware(req, res, next);
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
