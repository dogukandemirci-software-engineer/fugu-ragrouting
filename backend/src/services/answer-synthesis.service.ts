import { env } from '../config/env';
import { logger } from '../utils/logger';
import { callChatLLM, streamChatLLM } from '../utils/llm-client';

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

const SYNTHESIS_SYSTEM_PROMPT = `You are a precise, grounded answer-synthesis engine for a retrieval-augmented system. You will be given a user question and a numbered list of retrieved source excerpts (marked [S1], [S2], etc.). Your ONLY job is to answer the question using EXCLUSIVELY the information contained in these excerpts.

STRICT GROUNDING RULES:
- Never use knowledge outside the provided excerpts, even if you know the answer from training. If the excerpts don't contain the answer, say so explicitly — do not guess, infer beyond what's stated, or fill gaps with general knowledge.
- Every factual claim you make must be traceable to a specific excerpt. Cite the excerpt inline immediately after the claim using its marker, e.g. "Revenue grew 12% in Q3 [S2]." Use multiple markers if a claim draws on more than one excerpt, e.g. [S1][S4].
- If the excerpts are empty, irrelevant to the question, or only partially answer it, say exactly what is and is not covered. Use this exact phrasing when nothing relevant is found: "I don't have enough information in the retrieved sources to answer this." Never apologize excessively or pad with disclaimers beyond this.
- Do not fabricate citation markers. Only cite excerpt numbers that were actually provided to you.

OUTPUT FORMATTING RULES (strict — the output is rendered as Markdown in a UI):
- Structure your answer for scannability. Prefer short paragraphs, bullet lists, and numbered steps over dense prose.
- When the excerpts contain tabular, comparative, or multi-attribute data, you MUST render it as a Markdown table with a header row — never as a wall of prose.
- Use Markdown headers (##, ###) to break up multi-part answers longer than ~150 words.
- Use **bold** for key terms, numbers, and named entities the user is likely scanning for.
- Use fenced code blocks (\`\`\`) for anything that is code, a command, a file path, or structured data (JSON/YAML/config).
- Never invent a table or list structure the source data doesn't support — only use these formats when they genuinely fit the content; don't force formatting onto a one-sentence answer.
- Keep the final answer self-contained and directly responsive to the question — do not restate the question, do not add unrequested meta-commentary about the retrieval process itself.

Answer now, following every rule above exactly.`;

const NO_INFO_ANSWER = "I don't have enough information in the retrieved sources to answer this.";

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openrouter: 'anthropic/claude-sonnet-4.5',
  openai: 'gpt-4o-mini',
  ollama: 'qwen2.5:0.5b',
};

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
  async synthesize(query: string, chunks: SourceChunk[]): Promise<SynthesisResult> {
    if (chunks.length === 0) {
      return { answer: NO_INFO_ANSWER, citations: [], degraded: false };
    }

    const userMessage = buildUserMessage(query, chunks);
    const provider = env.LLM_SYNTHESIS_PROVIDER;

    try {
      const answer = await callWithTimeout(
        (signal) =>
          callChatLLM({
            provider,
            model: env.LLM_SYNTHESIS_MODEL ?? DEFAULT_MODELS[provider],
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
        provider,
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
    chunks: SourceChunk[]
  ): AsyncGenerator<string, SynthesisResult, void> {
    if (chunks.length === 0) {
      yield NO_INFO_ANSWER;
      return { answer: NO_INFO_ANSWER, citations: [], degraded: false };
    }

    const userMessage = buildUserMessage(query, chunks);
    const provider = env.LLM_SYNTHESIS_PROVIDER;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.LLM_SYNTHESIS_TIMEOUT_MS);

    let answer = '';
    try {
      for await (const delta of streamChatLLM({
        provider,
        model: env.LLM_SYNTHESIS_MODEL ?? DEFAULT_MODELS[provider],
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
        provider,
        err: err instanceof Error ? err.message : String(err),
      });
      return { answer, citations: extractCitations(answer), degraded: true };
    } finally {
      clearTimeout(timer);
    }
  },
};
