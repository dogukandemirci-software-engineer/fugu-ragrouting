export type QueryStrategy = 'vector_only' | 'graph_only' | 'hybrid' | 'auto';

export interface QuerySource {
  content: string;
  source: 'vector' | 'graph';
  score: number;
  document_id?: string;
  metadata?: Record<string, unknown>;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  percent: number;
  warn: boolean;
}

export interface QueryResponse {
  answer: string;
  citations: string[];
  answer_degraded: boolean;
  results: QuerySource[];
  explain: Record<string, unknown>;
  quota: QuotaInfo;
}

export interface QueryOptions {
  strategy?: QueryStrategy;
  top_k?: number;
  signal?: AbortSignal;
}

/** Server-Sent Events emitted by `POST /api/queries/stream`. */
export type QueryStreamEvent =
  | { type: 'meta'; results: QuerySource[]; explain: Record<string, unknown>; quota: QuotaInfo }
  | { type: 'delta'; text: string }
  | { type: 'done'; citations: string[]; answer_degraded: boolean }
  | { type: 'error'; message: string };

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface FuguDocument {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DocumentUploadResponse {
  document_id: string;
  status: 'pending';
}

export interface ListDocumentsOptions {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export type LLMCredentialProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

export interface CredentialDisplay {
  provider: LLMCredentialProvider;
  model: string;
  keyLastFour: string;
  lastVerifiedAt: string | null;
}

export interface CredentialModel {
  id: string;
  label: string;
  free: boolean;
}

export interface SaveCredentialInput {
  provider: LLMCredentialProvider;
  model: string;
  apiKey: string;
}
