import { LLMCredentialProvider } from '../store/api/credentialApi';

// Mirrors backend/src/config/llm-credential-models.ts — fixed dropdown, no
// free-text model IDs.
export const SUPPORTED_LLM_MODELS: Record<LLMCredentialProvider, string[]> = {
  anthropic: ['claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  openrouter: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4o', 'google/gemini-2.5-pro'],
};

export const PROVIDER_LABELS: Record<LLMCredentialProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
};
