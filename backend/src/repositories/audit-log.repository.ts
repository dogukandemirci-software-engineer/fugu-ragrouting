import { BaseRepository } from './base.repository';
import { AuditLog } from '../entities/audit-log.entity';
import { PAGINATION } from '../config/constants';
import { getScopedClient } from '../config/request-context';
import { pool } from '../config/database';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INSERT_SQL = `INSERT INTO audit_logs
   (organization_id, actor_user_id, actor_api_key_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
 RETURNING *`;

function insertValues(data: Omit<AuditLog, 'id' | 'created_at'>): unknown[] {
  return [
    data.organization_id,
    data.actor_user_id,
    data.actor_api_key_id,
    data.action,
    data.resource_type,
    data.resource_id,
    JSON.stringify(data.metadata),
    data.ip_address,
    data.user_agent,
  ];
}

export class AuditLogRepository extends BaseRepository {
  async create(data: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    // audit_logs is RLS-protected: the INSERT's WITH CHECK requires
    // current_org_id() to equal organization_id. Inside a request that's set by
    // orgScopeMiddleware, so the normal scoped path works. But public auth
    // routes (login/refresh/forgot-password) have no request scope — there
    // current_org_id() is NULL and the INSERT would silently fail the policy.
    // So when there's no scoped client, open a short transaction and set the
    // GUC to this row's own organization_id, satisfying the policy for a
    // legitimate system-originated audit entry.
    if (getScopedClient()) {
      const log = await this.queryOne<AuditLog>(INSERT_SQL, insertValues(data));
      return log!;
    }

    if (!UUID_RE.test(data.organization_id)) {
      // SET LOCAL cannot be parameterized; refuse anything not provably a UUID.
      throw new Error('Invalid organization id for audit log');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL app.current_org_id = '${data.organization_id}'`);
      const result = await client.query(INSERT_SQL, insertValues(data));
      await client.query('COMMIT');
      return result.rows[0] as AuditLog;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(orgId: string, options?: { limit?: number; offset?: number; action?: string }): Promise<AuditLog[]> {
    const limit = options?.limit ?? PAGINATION.DEFAULT_LIMIT;
    const offset = options?.offset ?? 0;
    const params: unknown[] = [orgId, limit, offset];

    let where = 'WHERE al.organization_id = $1';
    if (options?.action) {
      where += ` AND al.action = $${params.length + 1}`;
      params.push(options.action);
    }

    // Left-joined actor identity so the UI can show "who" without a second
    // round-trip; NULL for system-originated entries (e.g. failed logins
    // before a user is resolved, or API-key-driven actions).
    return this.query<AuditLog>(
      `SELECT al.*, u.full_name AS actor_full_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${where} ORDER BY al.created_at DESC LIMIT $2 OFFSET $3`,
      params
    );
  }
}
