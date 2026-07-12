import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AccountService } from '../services/account.service';
import { DataExportService } from '../services/data-export.service';
import { TeamService } from '../services/team.service';
import { asyncHandler } from '../middlewares/async-handler';

export const AccountController = {
  exportData: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const data = await DataExportService.exportForUser(req.user!.id, req.user!.orgId);
    res.json(data);
  }),

  listInvitations: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const invitations = await TeamService.listPendingInvitations(req.user!.id);
    res.json({ invitations });
  }),

  acceptInvitation: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await TeamService.acceptInvitation({ orgId: req.params.orgId, userId: req.user!.id });
    res.json({ message: 'Invitation accepted' });
  }),

  declineInvitation: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await TeamService.declineInvitation({ orgId: req.params.orgId, userId: req.user!.id });
    res.json({ message: 'Invitation declined' });
  }),

  updateProfile: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const user = await AccountService.updateProfile(req.user!.id, req.body);
    const { password_hash: _, ...userPublic } = user;
    res.json({ user: userPublic });
  }),

  getOrgSettings: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const settings = await AccountService.getOrgSettings(req.user!.orgId);
    res.json({ settings });
  }),

  updateOrgSettings: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const settings = await AccountService.updateOrgSettings(req.user!.orgId, req.body);
    res.json({ settings });
  }),

  deleteOrganization: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    await AccountService.scheduleOrgDeletion({
      orgId: req.user!.orgId,
      actorRole: req.user!.role,
      actorId: req.user!.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(202).json({ message: 'Organization scheduled for deletion in 30 days' });
  }),
};
