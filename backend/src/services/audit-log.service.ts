import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { PAGINATION } from '../config/constants';

const repo = new AuditLogRepository();

export const AuditLogService = {
  async log(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
    await repo.create(data).catch((err) => {
      // Audit log failure must never crash the main request
      console.error('Audit log write failed:', err);
    });
  },

  async list(orgId: string, options?: { limit?: number; offset?: number; action?: string }): Promise<AuditLog[]> {
    return repo.list(orgId, options);
  },
};
