import { LLMCredentialProvider } from '../entities/credential.entity';

// Fixed dropdown of supported models per BYOK provider — not free-text, so
// adding a model requires a code change (accepted tradeoff, see BYOK spec).
export const SUPPORTED_LLM_MODELS: Record<LLMCredentialProvider, string[]> = {
  anthropic: ['claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  openrouter: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4o', 'google/gemini-2.5-pro'],
};

export function isValidLLMCredential(provider: string, model: string): provider is LLMCredentialProvider {
  const models = SUPPORTED_LLM_MODELS[provider as LLMCredentialProvider];
  return !!models && models.includes(model);
}
