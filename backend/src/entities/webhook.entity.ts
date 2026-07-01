export interface Webhook {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  url: string;
  secret_hash: string;
  events: string[];
  active: boolean;
  last_triggered_at: Date | null;
  failure_count: number;
  created_at: Date;
  updated_at: Date;
}

export type WebhookPublic = Omit<Webhook, 'secret_hash'>;
