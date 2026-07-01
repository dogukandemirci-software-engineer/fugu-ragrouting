import { BaseRepository } from './base.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { PAGINATION } from '../config/constants';

export class AuditLogRepository extends BaseRepository {
  async create(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const log = await this.queryOne<AuditLog>(
      `INSERT INTO audit_logs
         (organization_id, actor_user_id, actor_api_key_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.organization_id,
        data.actor_user_id,
        data.actor_api_key_id,
        data.action,
        data.resource_type,
        data.resource_id,
        JSON.stringify(data.metadata),
        data.ip_address,
        data.user_agent,
      ]
    );
    return log!;
  }

  async list(orgId: string, options?: { limit?: number; offset?: number; action?: string }): Promise<AuditLog[]> {
    const limit = options?.limit ?? PAGINATION.DEFAULT_LIMIT;
    const offset = options?.offset ?? 0;
    const params: unknown[] = [orgId, limit, offset];

    let where = 'WHERE organization_id = $1';
    if (options?.action) {
      where += ` AND action = $${params.length + 1}`;
      params.push(options.action);
    }

    return this.query<AuditLog>(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      params
    );
  }
}
