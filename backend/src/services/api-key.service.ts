import crypto from 'crypto';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { generateApiKey, hashToken } from '../utils/token.util';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ApiKeyPublic } from '../entities/api-key.entity';
import { AUDIT_ACTIONS } from '../config/constants';

const repo = new ApiKeyRepository();
const auditRepo = new AuditLogRepository();

export const ApiKeyService = {
  async list(orgId: string): Promise<ApiKeyPublic[]> {
    return repo.listByOrg(orgId);
  },

  async create(params: {
    orgId: string;
    userId: string;
    name: string;
    permissions: string[];
    expires_at?: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<{ key: ApiKeyPublic; raw_key: string }> {
    const { raw, prefix } = generateApiKey();
    const key_hash = hashToken(raw);

    const apiKey = await repo.create({
      organization_id: params.orgId,
      created_by: params.userId,
      name: params.name,
      key_hash,
      key_prefix: prefix,
      permissions: params.permissions,
      expires_at: params.expires_at ? new Date(params.expires_at) : null,
      revoked_at: null,
    });

    await auditRepo.create({
      organization_id: params.orgId,
      actor_user_id: params.userId,
      actor_api_key_id: null,
      action: AUDIT_ACTIONS.API_KEY_CREATED,
      resource_type: 'api_key',
      resource_id: apiKey.id,
      metadata: { name: params.name },
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    });

    const { key_hash: _, ...keyPublic } = apiKey;
    return { key: keyPublic, raw_key: raw };
  },

  async revoke(params: {
    id: string;
    orgId: string;
    userId: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const keys = await repo.listByOrg(params.orgId);
    const target = keys.find((k) => k.id === params.id);
    if (!target) throw new NotFoundError('API key');

    await repo.revoke(params.id, params.orgId);

    await auditRepo.create({
      organization_id: params.orgId,
      actor_user_id: params.userId,
      actor_api_key_id: null,
      action: AUDIT_ACTIONS.API_KEY_DELETED,
      resource_type: 'api_key',
      resource_id: params.id,
      metadata: { name: target.name },
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    });
  },

  // Called by api-key middleware to authenticate SDK requests
  async authenticate(rawKey: string): Promise<{ orgId: string; permissions: string[] } | null> {
    const key_hash = hashToken(rawKey);
    const apiKey = await repo.findByHash(key_hash);
    if (!apiKey) return null;

    // Update last used (fire and forget — non-critical)
    repo.updateLastUsed(apiKey.id).catch(() => {});

    return { orgId: apiKey.organization_id, permissions: apiKey.permissions };
  },
};
