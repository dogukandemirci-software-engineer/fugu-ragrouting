import Stripe from 'stripe';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { AuditLogService } from './audit-log.service';
import { AUDIT_ACTIONS } from '../config/constants';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const subRepo = new SubscriptionRepository();

// Stripe initialized only when key is configured
const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as const })
  : null;

const PRICE_IDS: Record<string, string> = {
  // TODO: replace with actual Stripe price IDs from dashboard
  pro_monthly: 'price_pro_monthly',
  enterprise_monthly: 'price_enterprise_monthly',
};

export const BillingService = {
  async getSubscription(orgId: string) {
    return subRepo.findByOrgId(orgId);
  },

  async getUsage(orgId: string) {
    return subRepo.getUsageForPeriod(orgId);
  },

  async createCheckoutSession(params: {
    orgId: string;
    userId: string;
    tier: 'pro' | 'enterprise';
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    if (!stripe) throw new Error('Stripe not configured');

    let sub = await subRepo.findByOrgId(params.orgId);
    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organization_id: params.orgId },
      });
      customerId = customer.id;
      if (sub) await subRepo.update(params.orgId, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS[`${params.tier}_monthly`], quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { organization_id: params.orgId, user_id: params.userId },
    });

    return session.url!;
  },

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new Error('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const orgId = stripeSub.metadata.organization_id;
        if (!orgId) break;

        const tier = stripeSub.metadata.tier as 'pro' | 'enterprise' ?? 'pro';
        await subRepo.update(orgId, {
          stripe_sub_id: stripeSub.id,
          status: stripeSub.status as any,
          tier,
          current_period_end: new Date(stripeSub.current_period_end * 1000),
          monthly_query_limit: tier === 'enterprise' ? 100_000 : 10_000,
        });

        await AuditLogService.log({
          organization_id: orgId,
          actor_user_id: null,
          actor_api_key_id: null,
          action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGED,
          resource_type: 'subscription',
          resource_id: null,
          metadata: { tier, status: stripeSub.status },
          ip_address: null,
          user_agent: null,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const orgId = stripeSub.metadata.organization_id;
        if (!orgId) break;

        await subRepo.update(orgId, {
          status: 'canceled',
          tier: 'free',
          monthly_query_limit: 1000,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const sub = await subRepo.findByStripeSubId(subId);
        if (!sub) break;

        await subRepo.update(sub.organization_id, { status: 'past_due' });
        logger.warn('Payment failed for org', { org_id: sub.organization_id });
        break;
      }

      default:
        logger.debug('Unhandled Stripe event', { type: event.type });
    }
  },
};
