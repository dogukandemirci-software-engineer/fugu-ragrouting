import { BaseRepository } from './base.repository';
import { OrganizationLLMCredential, LLMCredentialProvider } from '../entities/credential.entity';

export class CredentialRepository extends BaseRepository {
  async findByOrg(orgId: string): Promise<OrganizationLLMCredential | null> {
    return this.queryOne<OrganizationLLMCredential>(
      'SELECT * FROM organization_llm_credentials WHERE organization_id = $1',
      [orgId]
    );
  }

  async upsert(data: {
    organization_id: string;
    provider: LLMCredentialProvider;
    model: string;
    encrypted_api_key: Buffer;
    key_iv: Buffer;
    key_auth_tag: Buffer;
    key_last_four: string;
    last_verified_at: Date;
  }): Promise<OrganizationLLMCredential> {
    const row = await this.queryOne<OrganizationLLMCredential>(
      `INSERT INTO organization_llm_credentials
         (organization_id, provider, model, encrypted_api_key, key_iv, key_auth_tag, key_last_four, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (organization_id) DO UPDATE SET
         provider = EXCLUDED.provider,
         model = EXCLUDED.model,
         encrypted_api_key = EXCLUDED.encrypted_api_key,
         key_iv = EXCLUDED.key_iv,
         key_auth_tag = EXCLUDED.key_auth_tag,
         key_last_four = EXCLUDED.key_last_four,
         last_verified_at = EXCLUDED.last_verified_at,
         updated_at = NOW()
       RETURNING *`,
      [
        data.organization_id,
        data.provider,
        data.model,
        data.encrypted_api_key,
        data.key_iv,
        data.key_auth_tag,
        data.key_last_four,
        data.last_verified_at,
      ]
    );
    return row!;
  }

  async remove(orgId: string): Promise<void> {
    await this.query('DELETE FROM organization_llm_credentials WHERE organization_id = $1', [orgId]);
  }
}
