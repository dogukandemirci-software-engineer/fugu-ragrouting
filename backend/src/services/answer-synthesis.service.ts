import { logger } from '../utils/logger';
import { callChatLLM, streamChatLLM } from '../utils/llm-client';
import { LLMCredentialDecrypted } from '../entities/credential.entity';
import { env } from '../config/env';

export interface SourceChunk {
  id: string; // "S1", "S2", ... — citation marker, must match display order
  content: string;
  source: 'vector' | 'graph';
  document_id?: string;
  score: number;
}

export interface SynthesisResult {
  answer: string;
  citations: string[];
  degraded: boolean;
}

const SYNTHESIS_SYSTEM_PROMPT = `You are a grounded answer-synthesis engine for a retrieval-augmented system. You get a user question and numbered source excerpts (marked [S1], [S2], ...). Answer using ONLY those excerpts.

Grounding:
- Never use outside knowledge, even if you know the answer. If the excerpts don't cover it, don't guess or fill gaps.
- Cite every factual claim inline right after it, e.g. "Revenue grew 12% in Q3 [S2]." Stack markers for multi-source claims, e.g. [S1][S4].
- If excerpts are empty, irrelevant, or only partial, say exactly what's covered. If nothing relevant exists, reply exactly: "I don't have enough information in the retrieved sources to answer this." No other apology or disclaimer.
- Never invent a citation marker beyond what was provided.

Formatting (rendered as Markdown):
- Short paragraphs, bullets, numbered steps over dense prose.
- Tabular/comparative/multi-attribute data → a Markdown table with a header row, never prose.
- ## / ### headers for answers longer than ~150 words.
- **Bold** key terms, numbers, named entities.
- Fenced code blocks for code, commands, paths, or structured data.
- Only use tables/lists where the content genuinely fits — don't force structure onto a one-line answer.
- Answer only the question. No restating it, no meta-commentary about retrieval.`;

const NO_INFO_ANSWER = "I don't have enough information in the retrieved sources to answer this.";

function buildUserMessage(query: string, chunks: SourceChunk[]): string {
  const sources = chunks.map((c) => `[${c.id}] ${c.content}`).join('\n');
  return `Question: ${query}\n\nRetrieved sources:\n${sources}`;
}

function extractCitations(answer: string): string[] {
  const matches = answer.matchAll(/\[S(\d+)\]/g);
  const found = new Set<string>();
  for (const m of matches) found.add(`S${m[1]}`);
  return Array.from(found);
}

async function callWithTimeout(fn: (signal: AbortSignal) => Promise<string>, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export const AnswerSynthesisService = {
  // credential is the caller's org's own BYOK key — required, since synthesis
  // no longer runs on any FUGU-paid shared key (see BYOKRequiredError callers).
  async synthesize(query: string, chunks: SourceChunk[], credential: LLMCredentialDecrypted): Promise<SynthesisResult> {
    if (chunks.length === 0) {
      return { answer: NO_INFO_ANSWER, citations: [], degraded: false };
    }

    const userMessage = buildUserMessage(query, chunks);

    try {
      const answer = await callWithTimeout(
        (signal) =>
          callChatLLM({
            provider: credential.provider,
            model: credential.model,
            apiKey: credential.apiKey,
            systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
            userMessage,
            maxTokens: env.LLM_SYNTHESIS_MAX_TOKENS,
            signal,
          }),
        env.LLM_SYNTHESIS_TIMEOUT_MS
      );

      return { answer, citations: extractCitations(answer), degraded: false };
    } catch (err) {
      logger.warn('Answer synthesis failed, degrading to raw sources', {
        provider: credential.provider,
        err: err instanceof Error ? err.message : String(err),
      });
      return { answer: '', citations: [], degraded: true };
    }
  },

  // Streaming variant: yields answer text deltas as the LLM produces them, then
  // returns the accumulated answer + citations via the final `full` value so the
  // caller can persist/log the complete result. On empty sources it yields the
  // no-info message once; on provider failure it signals `degraded` with no text
  // (the SSE endpoint then surfaces raw sources like the non-streaming path).
  async *synthesizeStream(
    query: string,
    chunks: SourceChunk[],
    credential: LLMCredentialDecrypted
  ): AsyncGenerator<string, SynthesisResult, void> {
    if (chunks.length === 0) {
      yield NO_INFO_ANSWER;
      return { answer: NO_INFO_ANSWER, citations: [], degraded: false };
    }

    const userMessage = buildUserMessage(query, chunks);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.LLM_SYNTHESIS_TIMEOUT_MS);

    let answer = '';
    try {
      for await (const delta of streamChatLLM({
        provider: credential.provider,
        model: credential.model,
        apiKey: credential.apiKey,
        systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
        userMessage,
        maxTokens: env.LLM_SYNTHESIS_MAX_TOKENS,
        signal: controller.signal,
      })) {
        answer += delta;
        yield delta;
      }
      return { answer, citations: extractCitations(answer), degraded: false };
    } catch (err) {
      logger.warn('Answer synthesis stream failed, degrading to raw sources', {
        provider: credential.provider,
        err: err instanceof Error ? err.message : String(err),
      });
      return { answer, citations: extractCitations(answer), degraded: true };
    } finally {
      clearTimeout(timer);
    }
  },
};
