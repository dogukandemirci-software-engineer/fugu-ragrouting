import { OrganizationRepository } from '../repositories/organization.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogService } from './audit-log.service';
import { AUDIT_ACTIONS } from '../config/constants';
import { ForbiddenError, NotFoundError } from '../utils/errors';

const orgRepo = new OrganizationRepository();
const userRepo = new UserRepository();

export const TeamService = {
  async listMembers(orgId: string) {
    return orgRepo.listMembers(orgId);
  },

  async invite(params: {
    orgId: string;
    invitedByUserId: string;
    invitedByRole: string;
    email: string;
    role: string;
  }) {
    if (params.invitedByRole === 'viewer' || params.invitedByRole === 'member') {
      throw new ForbiddenError('Only admins and owners can invite members');
    }

    const user = await userRepo.findByEmail(params.email);
    // If user doesn't exist: create a placeholder or send invite email
    // For MVP: require user to already have an account
    if (!user) {
      throw new NotFoundError(`User with email ${params.email} (must sign up first)`);
    }

    const existing = await orgRepo.getMember(params.orgId, user.id);
    if (existing) {
      throw new Error('User is already a member of this organization');
    }

    await orgRepo.addMember({
      org_id: params.orgId,
      user_id: user.id,
      role: params.role,
      invited_by: params.invitedByUserId,
    });

    await AuditLogService.log({
      organization_id: params.orgId,
      actor_user_id: params.invitedByUserId,
      actor_api_key_id: null,
      action: AUDIT_ACTIONS.TEAM_MEMBER_INVITED,
      resource_type: 'user',
      resource_id: user.id,
      metadata: { email: params.email, role: params.role },
      ip_address: null,
      user_agent: null,
    });
  },

  async updateRole(params: { orgId: string; actorRole: string; memberId: string; newRole: string }) {
    if (params.actorRole !== 'owner' && params.actorRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can change member roles');
    }
    await orgRepo.updateMemberRole(params.orgId, params.memberId, params.newRole);
  },

  async removeMember(params: { orgId: string; actorRole: string; actorId: string; memberId: string }) {
    if (params.actorRole !== 'owner' && params.actorRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can remove members');
    }
    if (params.actorId === params.memberId) {
      throw new ForbiddenError('Cannot remove yourself');
    }
    await orgRepo.removeMember(params.orgId, params.memberId);

    await AuditLogService.log({
      organization_id: params.orgId,
      actor_user_id: params.actorId,
      actor_api_key_id: null,
      action: AUDIT_ACTIONS.TEAM_MEMBER_REMOVED,
      resource_type: 'user',
      resource_id: params.memberId,
      metadata: {},
      ip_address: null,
      user_agent: null,
    });
  },
};
