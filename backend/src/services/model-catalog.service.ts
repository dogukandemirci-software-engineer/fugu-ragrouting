import { LLMCredentialProvider } from '../entities/credential.entity';
import { logger } from '../utils/logger';

export interface CatalogModel {
  id: string;
  label: string;
  free: boolean;
}

// Fixed dropdown for providers with no practical public catalog endpoint we
// can rely on pre-auth (Anthropic/OpenAI/Gemini model lists require a key to
// query and change rarely) — not free-text, so adding a model requires a code
// change here (accepted tradeoff, see BYOK spec).
const STATIC_MODELS: Record<Exclude<LLMCredentialProvider, 'openrouter'>, CatalogModel[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-5-20250929', label: 'claude-sonnet-4-5-20250929', free: false },
    { id: 'claude-opus-4-1-20250805', label: 'claude-opus-4-1-20250805', free: false },
    { id: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5-20251001', free: false },
  ],
  openai: [
    { id: 'gpt-4o', label: 'gpt-4o', free: false },
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini', free: false },
    { id: 'gpt-4.1', label: 'gpt-4.1', free: false },
  ],
  gemini: [
    { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro', free: false },
    { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash', free: false },
    // Free-tier AI Studio keys commonly have zero quota on 2.5-pro and no
    // longer get 2.5-flash access as new users — 2.0-flash remains on the
    // free tier for those accounts, so it's the one that actually works
    // for a plain "create key, don't touch billing" signup.
    { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash (free tier)', free: true },
  ],
};

// Curated fallback so OpenRouter always has a usable list (including at
// least one free model) even if the live fetch fails or is slow.
const OPENROUTER_FALLBACK: CatalogModel[] = [
  { id: 'anthropic/claude-sonnet-4.5', label: 'anthropic/claude-sonnet-4.5', free: false },
  { id: 'openai/gpt-4o', label: 'openai/gpt-4o', free: false },
  { id: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro', free: false },
];

interface OpenRouterModel {
  id: string;
  name: string;
  pricing?: { prompt?: string; completion?: string };
}

let cache: { models: CatalogModel[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — catalog changes infrequently

// A handful of well-known, reliable free-tier models get pinned to the front
// of the list so the dropdown always surfaces at least one usable free
// option instead of whatever happens to sort first / be a niche model.
const PREFERRED_FREE_MODEL_IDS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat:free',
];

async function fetchOpenRouterModels(): Promise<CatalogModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
  const data = (await res.json()) as { data: OpenRouterModel[] };

  const models: CatalogModel[] = data.data
    .filter((m) => !m.id.startsWith('~')) // exclude "latest" router aliases
    .map((m) => ({
      id: m.id,
      label: m.name,
      free: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
    }));

  // Ensure at least one known-good free model is present and sorted first,
  // even if OpenRouter's free catalog is sparse/rotating that day.
  const freeModels = models.filter((m) => m.free);
  const paidModels = models.filter((m) => !m.free);
  freeModels.sort((a, b) => {
    const ai = PREFERRED_FREE_MODEL_IDS.indexOf(a.id);
    const bi = PREFERRED_FREE_MODEL_IDS.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return [...freeModels, ...paidModels];
}

export const ModelCatalogService = {
  async getModels(provider: LLMCredentialProvider): Promise<CatalogModel[]> {
    if (provider !== 'openrouter') return STATIC_MODELS[provider];

    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.models;

    try {
      const models = await fetchOpenRouterModels();
      cache = { models, fetchedAt: Date.now() };
      return models;
    } catch (err) {
      logger.warn('OpenRouter model catalog fetch failed, using fallback list', {
        err: err instanceof Error ? err.message : String(err),
      });
      return cache?.models ?? OPENROUTER_FALLBACK;
    }
  },

  async isValidModel(provider: LLMCredentialProvider, model: string): Promise<boolean> {
    const models = await ModelCatalogService.getModels(provider);
    return models.some((m) => m.id === model);
  },
};
