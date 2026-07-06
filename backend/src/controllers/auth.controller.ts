import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../middlewares/async-handler';

export const AuthController = {
  signUp: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await AuthService.signUp(req.body);
    res.status(201).json(result);
  }),

  logIn: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await AuthService.logIn({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { refresh_token } = req.body;
    const tokens = await AuthService.refresh(refresh_token, req.ip, req.headers['user-agent']);
    res.json(tokens);
  }),

  listMyOrganizations: asyncHandler(async (req: Request & { user?: { id: string } }, res: Response, _next: NextFunction) => {
    const organizations = await AuthService.listMyOrganizations(req.user!.id);
    res.json({ organizations });
  }),

  switchOrg: asyncHandler(async (req: Request & { user?: { id: string } }, res: Response, _next: NextFunction) => {
    const result = await AuthService.switchOrg(req.user!.id, req.params.orgId);
    res.json(result);
  }),

  logout: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { refresh_token } = req.body;
    await AuthService.logout(refresh_token);
    res.status(204).end();
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await AuthService.verifyEmail(req.query.token as string);
    res.json({ message: 'Email verified successfully' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await AuthService.forgotPassword(req.body.email, req.ip, req.headers['user-agent']);
    res.json({ message: 'If an account exists, a reset email has been sent' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await AuthService.resetPassword(req.body.token, req.body.new_password);
    res.json({ message: 'Password reset successfully' });
  }),

  googleAuth: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id_token } = req.body;
    if (!id_token) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id_token is required' } }); return; }
    const result = await AuthService.googleAuth(id_token);
    res.json(result);
  }),
};
