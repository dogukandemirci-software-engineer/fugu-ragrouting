import { BaseRepository } from './base.repository';
import { ApiKey, ApiKeyPublic } from '../entities/api-key.entity';

export class ApiKeyRepository extends BaseRepository {
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return this.queryOne<ApiKey>(
      `SELECT * FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())`,
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

  async updateLastUsed(id: string): Promise<void> {
    await this.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [id]
    );
  }
}
