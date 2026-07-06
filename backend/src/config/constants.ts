export const QUOTA = {
  WARN_THRESHOLD: 0.8,   // 80% → show banner
  HARD_LIMIT: 1.0,       // 100% → block queries
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 60_000,         // 1 minute
  MAX_REQUESTS: 60,           // per API key per minute
  SLIDING_WINDOW_KEY_PREFIX: 'rl:',
} as const;

export const AUTH_RATE_LIMIT = {
  WINDOW_MS: 60_000,         // 1 minute
  MAX_REQUESTS: 10,           // per IP per minute — brute-force/enumeration guard
  SLIDING_WINDOW_KEY_PREFIX: 'rl:auth:',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUDIT_ACTIONS = {
  API_KEY_CREATED: 'api_key.created',
  API_KEY_DELETED: 'api_key.deleted',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DELETED: 'document.deleted',
  TEAM_MEMBER_INVITED: 'team.member_invited',
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  TEAM_INVITATION_ACCEPTED: 'team.invitation_accepted',
  TEAM_INVITATION_DECLINED: 'team.invitation_declined',
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_DELETED: 'webhook.deleted',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  ORG_SETTINGS_UPDATED: 'org.settings_updated',
  ORG_DELETION_SCHEDULED: 'org.deletion_scheduled',
  SECURITY_SETTINGS_UPDATED: 'security.settings_updated',
  PROFILE_UPDATED: 'profile.updated',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_REFRESH_FAILED: 'auth.refresh_failed',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  GDPR_ERASURE_REQUESTED: 'gdpr.erasure_requested',
} as const;

export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export const ROUTING_STRATEGY = {
  VECTOR_ONLY: 'vector_only',
  GRAPH_ONLY: 'graph_only',
  HYBRID: 'hybrid',
} as const;

export const SUBSCRIPTION_TIER = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

// Single source of truth for plan display data — consumed by both the
// billing page and the public landing page so pricing can't drift between them.
export const PLAN_CATALOG = [
  {
    tier: SUBSCRIPTION_TIER.FREE,
    label: 'Free',
    price: '$0',
    queries: '1,000',
    monthlyQueryLimit: 1000,
    features: ['1,000 queries/month', 'Vector routing', '5 documents'],
  },
  {
    tier: SUBSCRIPTION_TIER.PRO,
    label: 'Pro',
    price: '$49',
    queries: '10,000',
    monthlyQueryLimit: 10_000,
    features: ['10,000 queries/month', 'Vector + Graph routing', 'Unlimited documents', 'Webhooks', 'Priority support'],
    highlighted: true,
  },
  {
    tier: SUBSCRIPTION_TIER.ENTERPRISE,
    label: 'Enterprise',
    price: 'Custom',
    queries: '100,000+',
    monthlyQueryLimit: 100_000,
    features: ['Unlimited queries', 'All Pro features', 'SSO/SAML (coming soon)', 'SLA', 'Dedicated support'],
  },
] as const;

export const ORG_MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;
