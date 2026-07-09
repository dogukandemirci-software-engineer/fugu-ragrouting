// Regression test for the embedding BYOK fix: embedBatch/embedSingle must use
// the org's decrypted credential's key when its provider matches the
// configured EMBEDDING_PROVIDER, and fall back to the static env var key
// otherwise — previously the env key was used unconditionally, silently
// bypassing BYOK for embedding calls.

jest.mock('../../config/env', () => ({
  env: {
    EMBEDDING_PROVIDER: 'openrouter',
    EMBEDDING_MODEL: 'nomic-embed-text',
    OPENROUTER_API_KEY: 'env-fallback-key',
    OPENROUTER_EMBEDDING_MODEL: 'openai/text-embedding-3-small',
    OPENAI_API_KEY: 'env-openai-key',
    FRONTEND_URL: 'http://localhost:5173',
    EMBEDDING_CACHE_SIZE: 0,
    EMBEDDING_CACHE_TTL_MS: 60_000,
  },
}));

const mockFetch = jest.fn();
(global as unknown as { fetch: typeof fetch }).fetch = mockFetch as unknown as typeof fetch;

import { embedBatch } from '../../services/embedding.service';
import type { LLMCredentialDecrypted } from '../../entities/credential.entity';

function fakeEmbeddingResponse(dims = 4) {
  return {
    ok: true,
    json: async () => ({ data: [{ embedding: new Array(dims).fill(0.1), index: 0 }] }),
  };
}

describe('embedBatch — BYOK credential resolution', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(fakeEmbeddingResponse());
  });

  it('uses the org BYOK credential key when its provider matches EMBEDDING_PROVIDER', async () => {
    const credential: LLMCredentialDecrypted = {
      provider: 'openrouter',
      model: 'anthropic/claude-haiku-4-5',
      apiKey: 'org-byok-key',
    };

    await embedBatch(['hello world'], credential);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer org-byok-key');
  });

  it('falls back to the env var key when no BYOK credential is configured', async () => {
    await embedBatch(['hello world'], null);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer env-fallback-key');
  });

  it('falls back to the env var key when the BYOK credential is for a different provider', async () => {
    const credential: LLMCredentialDecrypted = {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      apiKey: 'org-anthropic-key',
    };

    await embedBatch(['hello world'], credential);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer env-fallback-key');
  });
});
