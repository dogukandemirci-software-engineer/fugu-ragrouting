import { Router } from 'express';
import express from 'express';
import { BillingController } from '../controllers/billing.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Stripe webhook needs raw body before JSON parsing
router.post('/webhook', express.raw({ type: 'application/json' }), BillingController.stripeWebhook);

router.use(requireAuth);
router.get('/subscription', BillingController.getSubscription);
router.post('/checkout', BillingController.createCheckout);

export default router;
