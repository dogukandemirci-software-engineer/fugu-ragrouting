import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export const AuthController = {
  async signUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.signUp(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async logIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.logIn(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token } = req.body;
      const tokens = await AuthService.refresh(refresh_token);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token } = req.body;
      await AuthService.logout(refresh_token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.verifyEmail(req.query.token as string);
      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body.email);
      res.json({ message: 'If an account exists, a reset email has been sent' });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body.token, req.body.new_password);
      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  },

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id_token } = req.body;
      if (!id_token) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'id_token is required' } }); return; }
      const result = await AuthService.googleAuth(id_token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
