import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { QueryResponse } from '../store/api/queryApi';

// Consumes the POST /api/queries/stream SSE endpoint. RTK Query can't surface
// incremental tokens, so we drive a raw fetch + ReadableStream reader here and
// expose the answer as it accumulates. The final assembled QueryResponse mirrors
// the non-streaming shape so the page can reuse the same render path.
type StreamEvent =
  | { type: 'meta'; results: QueryResponse['results']; explain: Record<string, unknown>; quota: QueryResponse['quota'] }
  | { type: 'delta'; text: string }
  | { type: 'done'; citations: string[]; answer_degraded: boolean }
  | { type: 'error'; message: string };

interface StreamState {
  answer: string;
  result: QueryResponse | null;
  isStreaming: boolean;
  error: string | null;
  byokRequired: boolean;
}

const INITIAL: StreamState = { answer: '', result: null, isStreaming: false, error: null, byokRequired: false };

export function useQueryStream() {
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const [state, setState] = useState<StreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (body: { query: string; strategy?: string; top_k?: number }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ ...INITIAL, isStreaming: true });

      let meta: Extract<StreamEvent, { type: 'meta' }> | null = null;
      let answer = '';

      try {
        const res = await fetch('/api/queries/stream', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok || !res.body) {
          // Non-SSE error (quota, validation, BYOK) comes back as JSON.
          let message = 'Query failed. Please try again.';
          let byokRequired = false;
          try {
            const j = await res.json();
            message = j?.error?.message ?? message;
            if (j?.error?.code === 'QUOTA_EXCEEDED') message = 'Monthly query quota exceeded. Upgrade your plan.';
            if (j?.error?.code === 'BYOK_REQUIRED') byokRequired = true;
          } catch { /* keep default */ }
          setState({ ...INITIAL, error: message, byokRequired });
          return { ok: false as const, error: message, byokRequired };
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          // SSE frames are separated by a blank line.
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const line = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            const event = JSON.parse(line.slice(5).trim()) as StreamEvent;

            if (event.type === 'meta') {
              meta = event;
            } else if (event.type === 'delta') {
              answer += event.text;
              setState((s) => ({ ...s, answer }));
            } else if (event.type === 'error') {
              setState({ ...INITIAL, error: event.message });
              return { ok: false as const, error: event.message };
            } else if (event.type === 'done' && meta) {
              const result: QueryResponse = {
                answer,
                citations: event.citations,
                answer_degraded: event.answer_degraded,
                results: meta.results,
                explain: meta.explain,
                quota: meta.quota,
              };
              setState({ answer, result, isStreaming: false, error: null, byokRequired: false });
              return { ok: true as const, result };
            }
          }
        }
        // Stream ended without a `done` frame (e.g. server closed early). If we
        // got `meta`, finalize a usable result from what we accumulated so the
        // page can still render sources/answer instead of a dangling spinner.
        if (meta) {
          const result: QueryResponse = {
            answer,
            citations: [],
            answer_degraded: answer.length === 0,
            results: meta.results,
            explain: meta.explain,
            quota: meta.quota,
          };
          setState({ answer, result, isStreaming: false, error: null, byokRequired: false });
          return { ok: true as const, result };
        }
        setState((s) => ({ ...s, isStreaming: false }));
        return { ok: false as const, error: 'Query ended unexpectedly. Please try again.' };
      } catch (err) {
        if (controller.signal.aborted) return { ok: false as const, error: 'aborted' };
        const message = err instanceof Error ? err.message : 'Query failed. Please try again.';
        setState({ ...INITIAL, error: message });
        return { ok: false as const, error: message, byokRequired: false };
      }
    },
    [token]
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, run, reset };
}
