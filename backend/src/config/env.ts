import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().optional(),

  SMTP_HOST: z.string().default('localhost'),

  SMTP_PORT: z.coerce.number().default(54325),
  SMTP_FROM: z.string().email().default('noreply@fugu.ai'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  // When false (default in dev), emails are logged instead of sent so local
  // signup/reset flows work without a real SMTP server. Set true in production.
  EMAIL_ENABLED: z.coerce.boolean().default(false),

  // Embedding (unchanged by BYOK — Ollama remains valid here as a local/no-cost
  // embedding option; only chat-LLM providers for synthesis/classifier/entity
  // extraction dropped Ollama support). "gemini" is BYOK-only — see
  // embedGemini() in embedding.service.ts — and requires the vector column
  // dimension to match (768 for text-embedding-004, see migration 009).
  // "bedrock" (AWS Titan v2, 1024-dim) is the platform-paid default — never
  // BYOK, authenticated via the EC2 instance's IAM role, no API key needed.
  EMBEDDING_PROVIDER: z.enum(['openai', 'openrouter', 'cohere', 'gemini', 'ollama', 'bedrock']).default('bedrock'),
  EMBEDDING_MODEL: z.string().default('amazon.titan-embed-text-v2:0'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1024),

  // AWS (Bedrock embeddings, S3 document storage) — credentials are NOT read
  // from env; the AWS SDK v3 default credential provider chain picks up the
  // EC2 instance profile automatically. Only region + bucket name are config.
  AWS_REGION: z.string().default('eu-north-1'),
  S3_DOCUMENTS_BUCKET: z.string().optional(),
  // In-process cache for single-text embeddings (identical queries re-embedded
  // on every request otherwise). 0 size disables it.
  EMBEDDING_CACHE_SIZE: z.coerce.number().default(1000),
  EMBEDDING_CACHE_TTL_MS: z.coerce.number().default(3600000),

  OPENAI_API_KEY: z.string().optional(),

  // OpenRouter (proxy for many models including Claude, Mistral, etc.)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_EMBEDDING_MODEL: z.string().optional(),

  // Cohere
  COHERE_API_KEY: z.string().optional(),

  // Ollama (local, no key needed) — embedding only, see EMBEDDING_PROVIDER above
  OLLAMA_URL: z.string().url().optional(),

  // Anthropic Claude (for LLM classifier)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Query classification is now done locally by the embedding-centroid
  // classifier (see embedding-centroid-classifier.ts) — no paid LLM classifier
  // call. The former LLM_CLASSIFIER_PROVIDER/MODEL vars are intentionally gone.

  // LLM Synthesis (answer generation) — max tokens/timeout are provider-agnostic,
  // applied to the organization's own BYOK synthesis call. Provider/model/key
  // come from organization_llm_credentials (see credential.service.ts), not env.
  LLM_SYNTHESIS_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_SYNTHESIS_TIMEOUT_MS: z.coerce.number().default(20000),

  // Entity extraction for graph ingestion — FUGU-paid, OpenRouter-backed
  ENTITY_EXTRACTION_ENABLED: z.coerce.boolean().default(true),
  ENTITY_EXTRACTION_PROVIDER: z.enum(['openai', 'anthropic', 'openrouter']).default('openrouter'),
  ENTITY_EXTRACTION_MODEL: z.string().optional(),
  ENTITY_EXTRACTION_MAX_TOKENS: z.coerce.number().default(512),

  // BYOK credential encryption — 32-byte AES-256-GCM master key (hex or
  // base64). Losing this key makes all stored organization API keys
  // unrecoverable; back it up to a secure secret store before deploy.
  // Validate the DECODED byte length (not just string length): a key that is
  // >=32 chars but does not decode to exactly 32 bytes silently passed a
  // plain .min(32) check, then threw on every BYOK save (a generic 500 that
  // manifested downstream as "credential never persists / Remove button never
  // appears"). Fail fast at boot instead, with a clear message.
  CREDENTIAL_ENCRYPTION_KEY: z.string().refine(
    (raw) => {
      const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
      return buf.length === 32;
    },
    { message: 'must decode to exactly 32 bytes for AES-256-GCM (64 hex chars, or base64 of 32 bytes)' }
  ),

  // Ingestion queue (Redpanda / Kafka-compatible)
  INGESTION_QUEUE_ENABLED: z.coerce.boolean().default(true),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  INGESTION_MAX_ATTEMPTS: z.coerce.number().default(3),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:\n', _parsed.error.format());
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
