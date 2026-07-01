/**
 * FUGU SDK — lightweight TypeScript client for the FUGU RAG Routing API.
 */

export type Strategy = 'vector_only' | 'graph_only' | 'hybrid' | 'auto';

export interface QueryOptions {
  strategy?: Strategy;
  top_k?: number;
}

export interface QueryResult {
  results: Array<{
    content: string;
    source: 'vector' | 'graph';
    score: number;
    document_id?: string;
    metadata: Record<string, unknown>;
  }>;
  explain: {
    forced: boolean;
    graph_available: boolean;
    vector_count: number;
    graph_count: number;
    classifier: string;
    confidence: number;
    strategy_selected: Strategy;
    strategy_final: Strategy;
    top_k: number;
  };
  quota: {
    used: number;
    limit: number;
    percent: number;
    warn: boolean;
  };
}

export class FuguClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string, baseUrl = 'http://localhost:3001') {
    if (!apiKey.startsWith('fugu_sk_')) {
      throw new Error('Invalid API key format. Must start with fugu_sk_');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(`FUGU API error ${res.status}: ${(err as any)?.error?.message ?? res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Execute a RAG query against your organization's knowledge base.
   * The routing engine automatically selects vector, graph, or hybrid strategy.
   */
  async query(text: string, options: QueryOptions = {}): Promise<QueryResult> {
    return this.request<QueryResult>('/api/queries/v1/query', {
      query: text,
      strategy: options.strategy ?? 'auto',
      top_k: options.top_k ?? 5,
    });
  }
}
