import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { BillingService } from '../services/billing.service';
import { env } from '../config/env';

export const BillingController = {
  async getSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [sub, usage] = await Promise.all([
        BillingService.getSubscription(req.user!.orgId),
        BillingService.getUsage(req.user!.orgId),
      ]);
      res.json({ subscription: sub, usage });
    } catch (err) {
      next(err);
    }
  },

  async createCheckout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = await BillingService.createCheckoutSession({
        orgId: req.user!.orgId,
        userId: req.user!.id,
        tier: req.body.tier,
        successUrl: `${env.FRONTEND_URL}/dashboard/billing?success=true`,
        cancelUrl: `${env.FRONTEND_URL}/dashboard/billing`,
      });
      res.json({ url });
    } catch (err) {
      next(err);
    }
  },

  async stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      await BillingService.handleStripeWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
};
