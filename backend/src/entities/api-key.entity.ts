export interface ApiKey {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

export type ApiKeyPublic = Omit<ApiKey, 'key_hash'>;
