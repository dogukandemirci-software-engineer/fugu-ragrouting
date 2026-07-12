/**
 * Multi-provider embedding service.
 * Provider is selected via EMBEDDING_PROVIDER env var (default: bedrock).
 *
 * Providers:
 *   openai      — OpenAI text-embedding-3-small / text-embedding-3-large
 *   openrouter  — OpenRouter (OpenAI-compatible endpoint, supports many models)
 *   cohere      — Cohere embed-english-v3.0 / embed-multilingual-v3.0
 *   gemini      — Google Generative Language API (text-embedding-004, etc.) — BYOK only
 *   ollama      — Local Ollama (nomic-embed-text, mxbai-embed-large, etc.) — free, no API key
 *   bedrock     — AWS Bedrock Titan Text Embeddings v2 — platform-paid default,
 *                  never BYOK, authenticated via the EC2 instance's IAM role
 */
import { BedrockRuntimeClient, InvokeModelCommand, ThrottlingException } from '@aws-sdk/client-bedrock-runtime';
import { env } from '../config/env';
import { mapWithConcurrency } from '../utils/concurrency';
import { LRUCache } from '../utils/lru-cache';
import type { LLMCredentialDecrypted } from '../entities/credential.entity';

function resolveKey(credential: LLMCredentialDecrypted | null | undefined, envKey: string | undefined, envVarName: string): string {
  const key = credential?.apiKey ?? envKey;
  if (!key) throw new Error(`${envVarName} not set`);
  return key;
}

// Query embeddings are the hot path: the same question re-asked (or the same
// text embedded during ingestion of near-duplicate chunks) would otherwise hit
// the provider every time. Cache keyed by provider+model+text so a config
// change never serves a stale-dimension vector.
const embeddingCache =
  env.EMBEDDING_CACHE_SIZE > 0
    ? new LRUCache<number[]>(env.EMBEDDING_CACHE_SIZE, env.EMBEDDING_CACHE_TTL_MS)
    : null;

function cacheKey(text: string): string {
  return `${env.EMBEDDING_PROVIDER}:${env.EMBEDDING_MODEL}:${text}`;
}

export type EmbeddingProvider = 'openai' | 'openrouter' | 'cohere' | 'gemini' | 'ollama' | 'bedrock';

async function embedOpenAI(texts: string[], credential?: LLMCredentialDecrypted | null): Promise<number[][]> {
  const apiKey = resolveKey(
    credential?.provider === 'openai' ? credential : null,
    env.OPENAI_API_KEY,
    'OPENAI_API_KEY'
  );
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: env.EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedOpenRouter(texts: string[], credential?: LLMCredentialDecrypted | null): Promise<number[][]> {
  // OpenRouter exposes an OpenAI-compatible /embeddings endpoint
  const apiKey = resolveKey(
    credential?.provider === 'openrouter' ? credential : null,
    env.OPENROUTER_API_KEY,
    'OPENROUTER_API_KEY'
  );
  const model = env.OPENROUTER_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

// Gemini has no FUGU-paid fallback — only usable when the org's own BYOK
// credential is for gemini, mirroring callGemini in llm-client.ts.
async function embedGemini(texts: string[], credential?: LLMCredentialDecrypted | null): Promise<number[][]> {
  const apiKey = credential?.provider === 'gemini' ? credential.apiKey : undefined;
  if (!apiKey) throw new Error('Gemini embeddings require a BYOK gemini credential');
  const model = env.EMBEDDING_MODEL.startsWith('text-embedding') ? env.EMBEDDING_MODEL : 'text-embedding-004';

  return mapWithConcurrency(texts, 4, async (text) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      }
    );
    if (!res.ok) throw new Error(`Gemini embedding error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { embedding: { values: number[] } };
    return data.embedding.values;
  });
}

const bedrockClient = new BedrockRuntimeClient({ region: env.AWS_REGION });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// New AWS accounts get a very low default TPS quota for on-demand Bedrock
// models (observed: throttling even at 1 req per several seconds), so a
// short backoff isn't enough — cap out at a long wait and keep retrying
// rather than giving up, since the alternative is the document landing in
// the DLQ. A minimum spacing between calls (see embedBedrock) reduces how
// often this path is even hit.
async function invokeBedrockWithRetry(text: string): Promise<number[]> {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: env.EMBEDDING_MODEL,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({ inputText: text }),
        })
      );
      const data = JSON.parse(Buffer.from(res.body).toString('utf-8')) as { embedding: number[] };
      return data.embedding;
    } catch (err) {
      const isThrottling = err instanceof ThrottlingException;
      if (!isThrottling || attempt === maxAttempts) {
        throw new Error(`Bedrock embedding error: ${err instanceof Error ? err.message : String(err)}`);
      }
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 20000));
    }
  }
  throw new Error('Bedrock embedding error: unreachable');
}

// Platform-paid default embedding path, never BYOK — credential param is
// accepted only to match the other providers' call signature for the
// embedBatch switch below; it's intentionally unused. Auth comes from the
// EC2 instance's IAM role via the SDK's default credential provider chain.
// Concurrency is 1 with a minimum spacing between requests: new AWS
// accounts' default Bedrock TPS quota is too low to safely parallelize
// (see invokeBedrockWithRetry for the per-request retry policy).
async function embedBedrock(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    if (results.length > 0) await sleep(1000);
    results.push(await invokeBedrockWithRetry(text));
  }
  return results;
}

async function embedOllama(texts: string[]): Promise<number[][]> {
  const model = env.EMBEDDING_MODEL.includes('/') ? env.EMBEDDING_MODEL : `nomic-embed-text`;
  const baseUrl = env.OLLAMA_URL ?? 'http://localhost:11434';

  // Ollama's HTTP API takes one prompt per request — bound concurrency so we
  // don't flood a single local model server with hundreds of simultaneous requests.
  return mapWithConcurrency(texts, 4, async (text) => {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    if (!res.ok) throw new Error(`Ollama embedding error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { embedding: number[] };
    return data.embedding;
  });
}

export async function embedBatch(texts: string[], credential?: LLMCredentialDecrypted | null): Promise<number[][]> {
  const provider: EmbeddingProvider = (env.EMBEDDING_PROVIDER as EmbeddingProvider) ?? 'openai';

  let vectors: number[][];
  switch (provider) {
    case 'openai':
      if (!credential && !env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
      vectors = await embedOpenAI(texts, credential);
      break;

    case 'openrouter':
      if (!credential && !env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
      vectors = await embedOpenRouter(texts, credential);
      break;

    case 'cohere':
      if (!env.COHERE_API_KEY) throw new Error('COHERE_API_KEY is not configured');
      vectors = await embedCohere(texts);
      break;

    case 'gemini':
      vectors = await embedGemini(texts, credential);
      break;

    case 'ollama':
      vectors = await embedOllama(texts);
      break;

    case 'bedrock':
      vectors = await embedBedrock(texts);
      break;

    default:
      throw new Error(`Unknown EMBEDDING_PROVIDER "${provider}"`);
  }

  // A zero-magnitude vector produces NaN/null similarity in pgvector's cosine
  // distance operator, silently poisoning search results — fail loudly instead.
  vectors.forEach((v, i) => {
    if (v.every((x) => x === 0)) {
      throw new Error(`Embedding provider "${provider}" returned a zero vector for text at index ${i}`);
    }
  });

  return vectors;
}

export async function embedSingle(text: string, credential?: LLMCredentialDecrypted | null): Promise<number[]> {
  const key = cacheKey(text);
  const cached = embeddingCache?.get(key);
  if (cached) return cached;

  const [vec] = await embedBatch([text], credential);
  embeddingCache?.set(key, vec);
  return vec;
}
