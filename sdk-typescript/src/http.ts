import { errorFromResponse, type ApiErrorBody } from './errors';

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl: typeof fetch;
}

/**
 * Thin wrapper around `fetch` shared by all resource sub-clients. Handles
 * auth header injection, base URL joining, JSON (de)serialization, and
 * translating non-2xx responses into typed `FuguApiError`s.
 */
export class HttpClient {
  constructor(private readonly opts: HttpClientOptions) {}

  private url(path: string): string {
    return `${this.opts.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.opts.apiKey}`,
      ...extra,
    };
  }

  async requestJson<T>(
    path: string,
    init: { method: string; body?: unknown; query?: Record<string, string | number | undefined>; signal?: AbortSignal }
  ): Promise<T> {
    let finalUrl = this.url(path);
    if (init.query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) finalUrl += `?${qs}`;
    }

    const res = await this.opts.fetchImpl(finalUrl, {
      method: init.method,
      headers: this.authHeaders(init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw errorFromResponse(res.status, body as ApiErrorBody | null);
    }

    return body as T;
  }

  async requestForm<T>(
    path: string,
    init: { method: string; form: FormData; signal?: AbortSignal }
  ): Promise<T> {
    const res = await this.opts.fetchImpl(this.url(path), {
      method: init.method,
      headers: this.authHeaders(),
      body: init.form,
      signal: init.signal,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw errorFromResponse(res.status, body as ApiErrorBody | null);
    }

    return body as T;
  }

  async requestVoid(path: string, init: { method: string; signal?: AbortSignal }): Promise<void> {
    const res = await this.opts.fetchImpl(this.url(path), {
      method: init.method,
      headers: this.authHeaders(),
      signal: init.signal,
    });

    if (res.status === 204 || res.ok) return;

    const body = await res.json().catch(() => null);
    throw errorFromResponse(res.status, body as ApiErrorBody | null);
  }

  /** Raw streaming request used by the SSE query stream. Returns the fetch Response. */
  async requestStream(
    path: string,
    init: { method: string; body?: unknown; signal?: AbortSignal }
  ): Promise<Response> {
    return this.opts.fetchImpl(this.url(path), {
      method: init.method,
      headers: this.authHeaders(init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  }
}
