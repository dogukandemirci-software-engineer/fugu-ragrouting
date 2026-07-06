import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TeamService } from '../services/team.service';
import { asyncHandler } from '../middlewares/async-handler';

export const TeamController = {
  list: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const members = await TeamService.listMembers(req.user!.orgId);
    res.json({ members });
  }),

  invite: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await TeamService.invite({
      orgId: req.user!.orgId,
      invitedByUserId: req.user!.id,
      invitedByRole: req.user!.role,
      email: req.body.email,
      role: req.body.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ message: 'Invitation sent' });
  }),

  updateRole: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await TeamService.updateRole({
      orgId: req.user!.orgId,
      actorRole: req.user!.role,
      memberId: req.params.memberId,
      newRole: req.body.role,
    });
    res.json({ message: 'Role updated' });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await TeamService.removeMember({
      orgId: req.user!.orgId,
      actorRole: req.user!.role,
      actorId: req.user!.id,
      memberId: req.params.memberId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(204).end();
  }),
};
