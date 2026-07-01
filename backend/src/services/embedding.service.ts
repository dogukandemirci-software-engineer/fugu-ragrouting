/**
 * Multi-provider embedding service.
 * Provider is selected via EMBEDDING_PROVIDER env var.
 *
 * Providers:
 *   openai      — OpenAI text-embedding-3-small / text-embedding-3-large
 *   openrouter  — OpenRouter (OpenAI-compatible endpoint, supports many models)
 *   cohere      — Cohere embed-english-v3.0 / embed-multilingual-v3.0
 *   ollama      — Local Ollama (nomic-embed-text, mxbai-embed-large, etc.) — free, no API key
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';

export type EmbeddingProvider = 'openai' | 'openrouter' | 'cohere' | 'ollama';

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: env.EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedOpenRouter(texts: string[]): Promise<number[][]> {
  // OpenRouter exposes an OpenAI-compatible /embeddings endpoint
  const model = env.OPENROUTER_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.FRONTEND_URL,
    },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenRouter embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedCohere(texts: string[]): Promise<number[][]> {
  const model = env.EMBEDDING_MODEL.startsWith('embed-') ? env.EMBEDDING_MODEL : 'embed-english-v3.0';
  const res = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, texts, input_type: 'search_document', truncate: 'END' }),
  });
  if (!res.ok) throw new Error(`Cohere embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { embeddings: number[][] };
  return data.embeddings;
}

async function embedOllama(texts: string[]): Promise<number[][]> {
  const model = env.EMBEDDING_MODEL.includes('/') ? env.EMBEDDING_MODEL : `nomic-embed-text`;
  const baseUrl = env.OLLAMA_URL ?? 'http://localhost:11434';

  // Ollama processes one text at a time
  const results: number[][] = [];
  for (const text of texts) {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) throw new Error(`Ollama embedding error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { embedding: number[] };
    results.push(data.embedding);
  }
  return results;
}

function zeroEmbeddings(texts: string[]): number[][] {
  logger.warn('No embedding provider configured — returning zero vectors (dev mode)');
  return texts.map(() => new Array(env.EMBEDDING_DIMENSIONS).fill(0));
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider: EmbeddingProvider = (env.EMBEDDING_PROVIDER as EmbeddingProvider) ?? 'openai';

  switch (provider) {
    case 'openai':
      if (!env.OPENAI_API_KEY) return zeroEmbeddings(texts);
      return embedOpenAI(texts);

    case 'openrouter':
      if (!env.OPENROUTER_API_KEY) return zeroEmbeddings(texts);
      return embedOpenRouter(texts);

    case 'cohere':
      if (!env.COHERE_API_KEY) return zeroEmbeddings(texts);
      return embedCohere(texts);

    case 'ollama':
      return embedOllama(texts);

    default:
      logger.warn(`Unknown EMBEDDING_PROVIDER "${provider}", falling back to zero vectors`);
      return zeroEmbeddings(texts);
  }
}

export async function embedSingle(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text]);
  return vec;
}
