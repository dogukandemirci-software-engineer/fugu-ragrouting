import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { BillingService } from '../services/billing.service';
import { env } from '../config/env';
import { asyncHandler } from '../middlewares/async-handler';
import { PLAN_CATALOG } from '../config/constants';

export const BillingController = {
  listPlans: asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    res.json({ plans: PLAN_CATALOG });
  }),

  getSubscription: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const [sub, usage] = await Promise.all([
      BillingService.getSubscription(req.user!.orgId),
      BillingService.getUsage(req.user!.orgId),
    ]);
    res.json({ subscription: sub, usage });
  }),

  createCheckout: asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const url = await BillingService.createCheckoutSession({
      orgId: req.user!.orgId,
      userId: req.user!.id,
      tier: req.body.tier,
      successUrl: `${env.FRONTEND_URL}/dashboard/billing?success=true`,
      cancelUrl: `${env.FRONTEND_URL}/dashboard/billing`,
    });
    res.json({ url });
  }),

  stripeWebhook: asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const signature = req.headers['stripe-signature'] as string;
    await BillingService.handleStripeWebhook(req.body as Buffer, signature, req.ip, req.headers['user-agent']);
    res.json({ received: true });
  }),
};
