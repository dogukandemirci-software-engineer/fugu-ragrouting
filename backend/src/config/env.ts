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

  // Embedding
  EMBEDDING_PROVIDER: z.enum(['openai', 'openrouter', 'cohere', 'ollama']).default('openai'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),
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

  // Ollama (local, no key needed)
  OLLAMA_URL: z.string().url().optional(),

  // Anthropic Claude (for LLM classifier)
  ANTHROPIC_API_KEY: z.string().optional(),

  // LLM Classifier provider (openai | anthropic | openrouter | ollama)
  LLM_CLASSIFIER_PROVIDER: z.enum(['openai', 'anthropic', 'openrouter', 'ollama']).default('openai'),
  LLM_CLASSIFIER_MODEL: z.string().optional(),

  // LLM Synthesis (answer generation from retrieved context)
  LLM_SYNTHESIS_PROVIDER: z.enum(['openai', 'anthropic', 'openrouter', 'ollama']).default('openrouter'),
  LLM_SYNTHESIS_MODEL: z.string().optional(),
  LLM_SYNTHESIS_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_SYNTHESIS_TIMEOUT_MS: z.coerce.number().default(20000),

  // Entity extraction for graph ingestion
  ENTITY_EXTRACTION_ENABLED: z.coerce.boolean().default(true),
  ENTITY_EXTRACTION_PROVIDER: z.enum(['openai', 'anthropic', 'openrouter', 'ollama']).default('openrouter'),
  ENTITY_EXTRACTION_MODEL: z.string().optional(),
  ENTITY_EXTRACTION_MAX_TOKENS: z.coerce.number().default(512),

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
