import { UserRepository } from '../repositories/user.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { AuditLogService } from './audit-log.service';
import { AUDIT_ACTIONS } from '../config/constants';
import { ForbiddenError } from '../utils/errors';
import { User } from '../entities/user.entity';

const userRepo = new UserRepository();
const orgRepo = new OrganizationRepository();

export const AccountService = {
  async updateProfile(userId: string, data: { full_name?: string }): Promise<User> {
    return userRepo.updateProfile(userId, data);
  },

  async updateOrgSettings(orgId: string, patch: { custom_instructions?: string }): Promise<Record<string, unknown>> {
    const org = await orgRepo.updateSettings(orgId, patch);
    return org.settings;
  },

  async getOrgSettings(orgId: string): Promise<Record<string, unknown>> {
    const org = await orgRepo.findById(orgId);
    if (!org) throw new Error('Organization not found');
    return org.settings;
  },

  async scheduleOrgDeletion(params: {
    orgId: string;
    actorRole: string;
    actorId: string;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    if (params.actorRole !== 'owner') {
      throw new ForbiddenError('Only the organization owner can delete the organization');
    }

    await orgRepo.softDelete(params.orgId, 30);

    const deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await AuditLogService.logAudit(AUDIT_ACTIONS.ORG_DELETION_SCHEDULED, {
      orgId: params.orgId,
      actorUserId: params.actorId,
      resourceType: 'organization',
      resourceId: params.orgId,
      metadata: { delete_after_days: 30 },
      ip: params.ip,
      userAgent: params.userAgent,
    });

    // Separate GDPR/KVKK compliance evidence entry: proves the erasure
    // request was logged immediately, satisfying the 1-month (extendable to
    // 2-month) response-window requirement even though physical deletion is
    // deferred 30 days for recovery.
    await AuditLogService.logAudit(AUDIT_ACTIONS.GDPR_ERASURE_REQUESTED, {
      orgId: params.orgId,
      actorUserId: params.actorId,
      resourceType: 'organization',
      resourceId: params.orgId,
      metadata: { deletion_scheduled_for: deletionScheduledFor },
      ip: params.ip,
      userAgent: params.userAgent,
    });
  },
};
