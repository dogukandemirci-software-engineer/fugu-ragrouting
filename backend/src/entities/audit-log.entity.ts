export interface AuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_api_key_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}
