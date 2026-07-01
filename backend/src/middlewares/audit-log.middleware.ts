import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AuditLogService } from '../services/audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Derives an action string from method + path, e.g. "POST /api/api-keys" → "api_key.created"
function inferAction(method: string, path: string): string {
  return `${method.toLowerCase()}:${path}`;
}

export function auditLogMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  const originalEnd = res.end.bind(res);

  (res as any).end = function (chunk: unknown, ...args: unknown[]) {
    if (res.statusCode < 400 && req.user) {
      AuditLogService.log({
        organization_id: req.user.orgId,
        actor_user_id: req.user.id !== 'api_key' ? req.user.id : null,
        actor_api_key_id: null,
        action: inferAction(req.method, req.path),
        resource_type: null,
        resource_id: null,
        metadata: {},
        ip_address: req.ip ?? null,
        user_agent: req.get('user-agent') ?? null,
      }).catch(() => {});
    }
    return originalEnd(chunk, ...(args as Parameters<typeof originalEnd>).slice(1));
  };

  next();
}
