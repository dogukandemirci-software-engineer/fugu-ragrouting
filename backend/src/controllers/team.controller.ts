import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { TeamService } from '../services/team.service';

export const TeamController = {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await TeamService.listMembers(req.user!.orgId);
      res.json({ members });
    } catch (err) {
      next(err);
    }
  },

  async invite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await TeamService.invite({
        orgId: req.user!.orgId,
        invitedByUserId: req.user!.id,
        invitedByRole: req.user!.role,
        email: req.body.email,
        role: req.body.role,
      });
      res.status(201).json({ message: 'Member added' });
    } catch (err) {
      next(err);
    }
  },

  async updateRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await TeamService.updateRole({
        orgId: req.user!.orgId,
        actorRole: req.user!.role,
        memberId: req.params.memberId,
        newRole: req.body.role,
      });
      res.json({ message: 'Role updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await TeamService.removeMember({
        orgId: req.user!.orgId,
        actorRole: req.user!.role,
        actorId: req.user!.id,
        memberId: req.params.memberId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
