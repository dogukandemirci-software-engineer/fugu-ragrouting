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
      AuditLogService.logAudit(inferAction(req.method, req.path), {
        orgId: req.user.orgId,
        actorUserId: req.user.id !== 'api_key' ? req.user.id : null,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      }).catch(() => {});
    }
    return originalEnd(chunk, ...(args as Parameters<typeof originalEnd>).slice(1));
  };

  next();
}
