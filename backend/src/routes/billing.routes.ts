import { Router } from 'express';
import express from 'express';
import { BillingController } from '../controllers/billing.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();

// Stripe webhook needs raw body before JSON parsing
router.post('/webhook', express.raw({ type: 'application/json' }), BillingController.stripeWebhook);

// Public — landing page and pre-login pricing display read from the same catalog
router.get('/plans', BillingController.listPlans);

router.use(requireAuth);
router.use(rateLimitMiddleware);
router.get('/subscription', BillingController.getSubscription);
router.post('/checkout', BillingController.createCheckout);

export default router;
