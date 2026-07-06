export type QueryStrategy = 'vector_only' | 'graph_only' | 'hybrid' | 'auto';

export interface QuerySource {
  content: string;
  source: 'vector' | 'graph';
  score: number;
  document_id?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryResponse {
  answer: string;
  citations: string[];
  answer_degraded: boolean;
  results: QuerySource[];
  explain: Record<string, unknown>;
  quota: { used: number; limit: number; percent: number; warn: boolean };
}

export interface FuguClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class FuguApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FuguApiError';
  }
}

export class FuguClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FuguClientOptions) {
    if (!options.apiKey) throw new Error('FuguClient requires an apiKey');
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'http://localhost:3001/api').replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async query(
    query: string,
    options?: { strategy?: QueryStrategy; top_k?: number; signal?: AbortSignal }
  ): Promise<QueryResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/queries/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query,
        strategy: options?.strategy,
        top_k: options?.top_k,
      }),
      signal: options?.signal,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message = body?.error?.message ?? `Request failed with status ${res.status}`;
      throw new FuguApiError(message, res.status, body?.error?.code);
    }

    return body as QueryResponse;
  }
}
