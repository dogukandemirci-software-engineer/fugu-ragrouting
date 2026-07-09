import { HttpClient } from '../http';
import { errorFromResponse, type ApiErrorBody } from '../errors';
import type { QueryOptions, QueryResponse, QueryStreamEvent } from '../types';

export class QueryResource {
  constructor(private readonly http: HttpClient) {}

  /** Runs a query and waits for the full (non-streaming) answer. */
  async execute(query: string, options: QueryOptions = {}): Promise<QueryResponse> {
    return this.http.requestJson<QueryResponse>('/queries/v1/query', {
      method: 'POST',
      body: { query, strategy: options.strategy, top_k: options.top_k },
      signal: options.signal,
    });
  }

  /**
   * Runs a query and streams the answer token-by-token via Server-Sent
   * Events. Yields `QueryStreamEvent`s as they arrive:
   *
   * ```ts
   * for await (const event of client.query.stream('...')) {
   *   if (event.type === 'delta') process.stdout.write(event.text);
   * }
   * ```
   */
  async *stream(query: string, options: QueryOptions = {}): AsyncGenerator<QueryStreamEvent, void, void> {
    const res = await this.http.requestStream('/queries/stream', {
      method: 'POST',
      body: { query, strategy: options.strategy, top_k: options.top_k },
      signal: options.signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      throw errorFromResponse(res.status, body as ApiErrorBody | null);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim()) as QueryStreamEvent;
          yield event;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
