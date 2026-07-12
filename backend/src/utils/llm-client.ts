import { env } from '../config/env';

export type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'gemini' | 'grok';

export interface LLMCallParams {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  signal?: AbortSignal;
  // BYOK synthesis calls pass the organization's own decrypted key; internal
  // FUGU-paid calls (classifier, entity extraction) omit this and fall back
  // to the shared env-configured key for that provider.
  apiKey?: string;
}

function resolveKey(params: LLMCallParams, envKey: string | undefined, envVarName: string): string {
  const key = params.apiKey ?? envKey;
  if (!key) throw new Error(`${envVarName} not set`);
  return key;
}

async function callAnthropic(params: LLMCallParams): Promise<string> {
  const apiKey = resolveKey(params, env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: params.signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ text: string }> };
  return data.content[0].text.trim();
}

async function callOpenRouter(params: LLMCallParams): Promise<string> {
  const apiKey = resolveKey(params, env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.FRONTEND_URL,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string | null }; finish_reason?: string }>;
  };
  const content = data.choices[0].message.content;
  // Mandatory-reasoning models (e.g. some free-tier models) can spend the
  // entire max_tokens budget on hidden reasoning and return content: null
  // with finish_reason "length" — a too-small maxTokens, not a real failure.
  if (content == null) {
    throw new Error(
      data.choices[0].finish_reason === 'length'
        ? 'Model returned no content — try a smaller/non-reasoning model or a larger maxTokens budget'
        : 'Model returned empty content'
    );
  }
  return content.trim();
}

async function callOpenAI(params: LLMCallParams): Promise<string> {
  const apiKey = resolveKey(params, env.OPENAI_API_KEY, 'OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content.trim();
}

// xAI's Grok API is BYOK-only (no FUGU-paid fallback) and OpenAI-compatible
// (same chat completions request/response shape) — see callOpenAI above.
async function callGrok(params: LLMCallParams): Promise<string> {
  if (!params.apiKey) throw new Error('Grok requires an API key (BYOK)');
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Grok error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content.trim();
}

// Gemini is BYOK-only (no FUGU-paid fallback), so params.apiKey is always
// required here — there is no env.GEMINI_API_KEY to fall back to.
async function callGemini(params: LLMCallParams): Promise<string> {
  if (!params.apiKey) throw new Error('Gemini requires an API key (BYOK)');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    signal: params.signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': params.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userMessage }] }],
      generationConfig: { maxOutputTokens: params.maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0].content.parts[0].text.trim();
}

// Single entry point for every chat-style LLM provider used across the codebase
// (classifier, answer synthesis, entity extraction) — keeps provider-specific
// fetch/header/parsing details in one place instead of duplicated per service.
export async function callChatLLM(params: LLMCallParams): Promise<string> {
  switch (params.provider) {
    case 'gemini':
      return callGemini(params);
    case 'anthropic':
      return callAnthropic(params);
    case 'openai':
      return callOpenAI(params);
    case 'openrouter':
      return callOpenRouter(params);
    case 'grok':
      return callGrok(params);
  }
}

// ─── Streaming ──────────────────────────────────────────────────────────────
// Yields answer text incrementally. Consumers (SSE endpoint) forward each delta
// to the client so tokens render as they arrive instead of after a full-answer
// round-trip. Provider wire formats differ: OpenAI/OpenRouter/Gemini and
// Anthropic use SSE (`data: {json}\n\n`) with different event shapes.

async function* readSSELines(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) yield line;
      }
    }
    const tail = buffer.trim();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

async function* streamOpenAICompatible(params: LLMCallParams, url: string, headers: Record<string, string>): AsyncGenerator<string> {
  const res = await fetch(url, {
    method: 'POST',
    signal: params.signal,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM stream error ${res.status}: ${await res.text()}`);
  for await (const line of readSSELines(res)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') break;
    try {
      const delta = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      // ignore keep-alive / partial lines
    }
  }
}

async function* streamAnthropic(params: LLMCallParams): AsyncGenerator<string> {
  const apiKey = resolveKey(params, env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: params.signal,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      stream: true,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic stream error ${res.status}: ${await res.text()}`);
  for await (const line of readSSELines(res)) {
    if (!line.startsWith('data:')) continue;
    try {
      const evt = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: { text?: string } };
      if (evt.type === 'content_block_delta' && evt.delta?.text) yield evt.delta.text;
    } catch {
      // ignore
    }
  }
}

async function* streamGemini(params: LLMCallParams): AsyncGenerator<string> {
  if (!params.apiKey) throw new Error('Gemini requires an API key (BYOK)');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: 'POST',
    signal: params.signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': params.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userMessage }] }],
      generationConfig: { maxOutputTokens: params.maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`Gemini stream error ${res.status}: ${await res.text()}`);
  for await (const line of readSSELines(res)) {
    if (!line.startsWith('data:')) continue;
    try {
      const evt = JSON.parse(line.slice(5).trim()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = evt.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text;
    } catch {
      // ignore
    }
  }
}

export function streamChatLLM(params: LLMCallParams): AsyncGenerator<string> {
  switch (params.provider) {
    case 'gemini':
      return streamGemini(params);
    case 'anthropic':
      return streamAnthropic(params);
    case 'openai': {
      const apiKey = resolveKey(params, env.OPENAI_API_KEY, 'OPENAI_API_KEY');
      return streamOpenAICompatible(params, 'https://api.openai.com/v1/chat/completions', {
        Authorization: `Bearer ${apiKey}`,
      });
    }
    case 'openrouter': {
      const apiKey = resolveKey(params, env.OPENROUTER_API_KEY, 'OPENROUTER_API_KEY');
      return streamOpenAICompatible(params, 'https://openrouter.ai/api/v1/chat/completions', {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': env.FRONTEND_URL,
      });
    }
    case 'grok': {
      if (!params.apiKey) throw new Error('Grok requires an API key (BYOK)');
      return streamOpenAICompatible(params, 'https://api.x.ai/v1/chat/completions', {
        Authorization: `Bearer ${params.apiKey}`,
      });
    }
  }
}
