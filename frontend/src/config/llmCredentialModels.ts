import { LLMCredentialProvider } from '../store/api/credentialApi';

export const PROVIDER_LABELS: Record<LLMCredentialProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
};
