-- Migration 004: Organization-owned LLM credentials (BYOK)
--
-- Answer synthesis moves from FUGU-paid shared keys to each organization's
-- own provider API key. Routing classifier, entity extraction, and embeddings
-- are unaffected — they continue to run on FUGU's OpenRouter credentials.

CREATE TABLE organization_llm_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini', 'openrouter')),
  model TEXT NOT NULL,
  encrypted_api_key BYTEA NOT NULL,
  key_iv BYTEA NOT NULL,
  key_auth_tag BYTEA NOT NULL,
  key_last_four TEXT NOT NULL,
  last_verified_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL PRIVILEGES ON organization_llm_credentials TO fugu_app;

ALTER TABLE organization_llm_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_llm_credentials FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON organization_llm_credentials
  USING (organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());
