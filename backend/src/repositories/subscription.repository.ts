import { BaseRepository } from './base.repository';
import { Subscription } from '../entities/subscription.entity';

export class SubscriptionRepository extends BaseRepository {
  async findByOrgId(orgId: string): Promise<Subscription | null> {
    return this.queryOne<Subscription>(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [orgId]
    );
  }

  async findByStripeSubId(stripeSubId: string): Promise<Subscription | null> {
    return this.queryOne<Subscription>(
      'SELECT * FROM subscriptions WHERE stripe_sub_id = $1',
      [stripeSubId]
    );
  }

  async create(orgId: string): Promise<Subscription> {
    const sub = await this.queryOne<Subscription>(
      `INSERT INTO subscriptions (organization_id) VALUES ($1) RETURNING *`,
      [orgId]
    );
    return sub!;
  }

  async update(orgId: string, data: Partial<Subscription>): Promise<Subscription> {
    const allowed = ['tier', 'stripe_customer_id', 'stripe_sub_id', 'status', 'trial_ends_at', 'current_period_end', 'monthly_query_limit'];
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([k]) => allowed.includes(k))
    );
    const { clause, values } = this.buildSetClause(filtered, 1);
    const sub = await this.queryOne<Subscription>(
      `UPDATE subscriptions SET ${clause}, updated_at = NOW()
       WHERE organization_id = $${values.length + 1}
       RETURNING *`,
      [...values, orgId]
    );
    return sub!;
  }

  async getUsageForPeriod(orgId: string): Promise<{ query_count: number; monthly_query_limit: number }> {
    const result = await this.queryOne<{ query_count: number; monthly_query_limit: number }>(
      `SELECT uc.query_count, s.monthly_query_limit
       FROM usage_counters uc
       JOIN subscriptions s ON s.organization_id = uc.organization_id
       WHERE uc.organization_id = $1
         AND uc.period_start = DATE_TRUNC('month', NOW())::date`,
      [orgId]
    );
    return result ?? { query_count: 0, monthly_query_limit: 1000 };
  }

  async incrementQueryCount(orgId: string): Promise<void> {
    await this.query(
      `INSERT INTO usage_counters (organization_id, period_start, query_count)
       VALUES ($1, DATE_TRUNC('month', NOW())::date, 1)
       ON CONFLICT (organization_id, period_start)
       DO UPDATE SET query_count = usage_counters.query_count + 1`,
      [orgId]
    );
  }
}
