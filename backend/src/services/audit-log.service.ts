import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { PAGINATION } from '../config/constants';

const repo = new AuditLogRepository();

export interface AuditContext {
  orgId: string;
  actorUserId?: string | null;
  actorApiKeyId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export const AuditLogService = {
  async log(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await repo.create(data).catch((err) => {
      // Audit log failure must never crash the main request
      console.error('Audit log write failed:', err);
    });
  },

  // Collapses the repetitive ~15-line AuditLogService.log({...}) call sites
  // (organization_id/actor_user_id/ip_address... filled by hand) into 3 lines.
  async logAudit(action: string, ctx: AuditContext): Promise<void> {
    await this.log({
      organization_id: ctx.orgId,
      actor_user_id: ctx.actorUserId ?? null,
      actor_api_key_id: ctx.actorApiKeyId ?? null,
      action,
      resource_type: ctx.resourceType ?? null,
      resource_id: ctx.resourceId ?? null,
      metadata: ctx.metadata ?? {},
      ip_address: ctx.ip ?? null,
      user_agent: ctx.userAgent ?? null,
    });
  },

  async list(orgId: string, options?: { limit?: number; offset?: number; action?: string }): Promise<AuditLog[]> {
    return repo.list(orgId, options);
  },
};
