import { BaseRepository } from './base.repository';
import { ApiKey, ApiKeyPublic } from '../entities/api-key.entity';

export class ApiKeyRepository extends BaseRepository {
  // Runs before the request's org scope is known (see auth bootstrap comment
  // in migrations/006_api_key_auth_lookup_function.sql) — uses a SECURITY
  // DEFINER function instead of a raw SELECT so it isn't silently zeroed out
  // by api_keys' FORCE ROW LEVEL SECURITY tenant_isolation policy.
  async findByHash(keyHash: string): Promise<Pick<ApiKey, 'id' | 'organization_id' | 'permissions'> | null> {
    return this.queryOne<Pick<ApiKey, 'id' | 'organization_id' | 'permissions'>>(
      `SELECT * FROM find_api_key_by_hash($1)`,
      [keyHash]
    );
  }

  async listByOrg(orgId: string): Promise<ApiKeyPublic[]> {
    return this.query<ApiKeyPublic>(
      `SELECT id, organization_id, created_by, name, key_prefix, permissions,
              last_used_at, expires_at, revoked_at, created_at
       FROM api_keys WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );
  }

  async create(data: Omit<ApiKey, 'id' | 'last_used_at' | 'created_at'>): Promise<ApiKey> {
    const key = await this.queryOne<ApiKey>(
      `INSERT INTO api_keys
         (organization_id, created_by, name, key_hash, key_prefix, permissions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.organization_id,
        data.created_by,
        data.name,
        data.key_hash,
        data.key_prefix,
        data.permissions,
        data.expires_at,
      ]
    );
    return key!;
  }

  async revoke(id: string, orgId: string): Promise<void> {
    await this.query(
      'UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
  }

  // Runs before org scope is set (called from the same auth-bootstrap path
  // as findByHash above) — same SECURITY DEFINER rationale.
  async updateLastUsed(id: string): Promise<void> {
    await this.query('SELECT touch_api_key_last_used($1)', [id]);
  }
}
