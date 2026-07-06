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
    ip?: string | null;
    userAgent?: string | null;
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

    await AuditLogService.logAudit(AUDIT_ACTIONS.TEAM_MEMBER_INVITED, {
      orgId: params.orgId,
      actorUserId: params.invitedByUserId,
      resourceType: 'user',
      resourceId: user.id,
      metadata: { email: params.email, role: params.role },
      ip: params.ip,
      userAgent: params.userAgent,
    });
  },

  async listPendingInvitations(userId: string) {
    return orgRepo.listPendingInvitations(userId);
  },

  // No audit log write here: the request's RLS session is scoped to the
  // caller's *current* org (set at auth time), not the org being joined/left,
  // so an INSERT with organization_id = the target org fails RLS's WITH CHECK
  // and aborts the whole transaction — silently undoing the membership
  // update too, since AuditLogService.log swallows its own errors. The
  // organization_members.joined_at change (or row deletion) is itself the
  // durable record of this event.
  async acceptInvitation(params: { orgId: string; userId: string }) {
    const invite = await orgRepo.getMember(params.orgId, params.userId);
    if (!invite || invite.joined_at) throw new NotFoundError('Invitation not found');

    await orgRepo.acceptInvitation(params.orgId, params.userId);
  },

  async declineInvitation(params: { orgId: string; userId: string }) {
    const invite = await orgRepo.getMember(params.orgId, params.userId);
    if (!invite || invite.joined_at) throw new NotFoundError('Invitation not found');

    await orgRepo.declineInvitation(params.orgId, params.userId);
  },

  async updateRole(params: { orgId: string; actorRole: string; memberId: string; newRole: string }) {
    if (params.actorRole !== 'owner' && params.actorRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can change member roles');
    }
    await orgRepo.updateMemberRole(params.orgId, params.memberId, params.newRole);
  },

  async removeMember(params: {
    orgId: string;
    actorRole: string;
    actorId: string;
    memberId: string;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    if (params.actorRole !== 'owner' && params.actorRole !== 'admin') {
      throw new ForbiddenError('Only owners and admins can remove members');
    }
    if (params.actorId === params.memberId) {
      throw new ForbiddenError('Cannot remove yourself');
    }
    await orgRepo.removeMember(params.orgId, params.memberId);

    await AuditLogService.logAudit(AUDIT_ACTIONS.TEAM_MEMBER_REMOVED, {
      orgId: params.orgId,
      actorUserId: params.actorId,
      resourceType: 'user',
      resourceId: params.memberId,
      ip: params.ip,
      userAgent: params.userAgent,
    });
  },
};
