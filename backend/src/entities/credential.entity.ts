export type LLMCredentialProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter' | 'grok';

export interface OrganizationLLMCredential {
  id: string;
  organization_id: string;
  provider: LLMCredentialProvider;
  model: string;
  encrypted_api_key: Buffer;
  key_iv: Buffer;
  key_auth_tag: Buffer;
  key_last_four: string;
  last_verified_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LLMCredentialDisplay {
  provider: LLMCredentialProvider;
  model: string;
  keyLastFour: string;
  lastVerifiedAt: Date;
}

export interface LLMCredentialDecrypted {
  provider: LLMCredentialProvider;
  model: string;
  apiKey: string;
}
