-- Migration 010: allow 'grok' as an organization_llm_credentials provider.
-- xAI's Grok API is OpenAI-compatible (same chat completions request/
-- response shape) — see callGrok() in llm-client.ts — so this is purely
-- widening the CHECK constraint, no new columns needed.
ALTER TABLE organization_llm_credentials DROP CONSTRAINT organization_llm_credentials_provider_check;
ALTER TABLE organization_llm_credentials ADD CONSTRAINT organization_llm_credentials_provider_check
  CHECK (provider IN ('anthropic', 'openai', 'gemini', 'openrouter', 'grok'));
