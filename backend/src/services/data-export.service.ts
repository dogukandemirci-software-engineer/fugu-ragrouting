import { UserRepository } from '../repositories/user.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { DocumentRepository } from '../repositories/document.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { AuditLogService } from './audit-log.service';

const userRepo = new UserRepository();
const orgRepo = new OrganizationRepository();
const docRepo = new DocumentRepository();
const apiKeyRepo = new ApiKeyRepository();

/**
 * GDPR Art. 20 / KVKK data-portability export. Returns only the requesting
 * user's own organization data in structured JSON — never raw file content,
 * password hashes, or raw/hashed API key values (metadata only).
 */
export const DataExportService = {
  async exportForUser(userId: string, orgId: string) {
    const [user, organization, documents, apiKeys, auditLogs] = await Promise.all([
      userRepo.findById(userId),
      orgRepo.findById(orgId),
      docRepo.list(orgId, { limit: 10000 }),
      apiKeyRepo.listByOrg(orgId),
      AuditLogService.list(orgId, { limit: 1000 }),
    ]);

    const { password_hash: _pwHash, ...userPublic } = user ?? ({} as Record<string, unknown>);

    return {
      exported_at: new Date().toISOString(),
      organization,
      user: userPublic,
      documents: documents.map((d) => ({
        id: d.id,
        name: d.name,
        file_type: d.file_type,
        file_size: d.file_size,
        status: d.status,
        chunk_count: d.chunk_count,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      api_keys: apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.key_prefix,
        permissions: k.permissions,
        last_used_at: k.last_used_at,
        expires_at: k.expires_at,
        revoked_at: k.revoked_at,
        created_at: k.created_at,
      })),
      audit_logs: auditLogs,
    };
  },
};
