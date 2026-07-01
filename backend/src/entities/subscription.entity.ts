export interface Subscription {
  id: string;
  organization_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_sub_id: string | null;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  trial_ends_at: Date | null;
  current_period_end: Date | null;
  monthly_query_limit: number;
  created_at: Date;
  updated_at: Date;
}
