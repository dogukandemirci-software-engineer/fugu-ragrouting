export const QUOTA = {
  WARN_THRESHOLD: 0.8,   // 80% → show banner
  HARD_LIMIT: 1.0,       // 100% → block queries
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 60_000,         // 1 minute
  MAX_REQUESTS: 60,           // per API key per minute
  SLIDING_WINDOW_KEY_PREFIX: 'rl:',
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
  WEBHOOK_CREATED: 'webhook.created',
  WEBHOOK_DELETED: 'webhook.deleted',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  ORG_SETTINGS_UPDATED: 'org.settings_updated',
  SECURITY_SETTINGS_UPDATED: 'security.settings_updated',
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

export const ORG_MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;
