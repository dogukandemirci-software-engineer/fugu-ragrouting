import { env } from '../config/env';

export type LLMProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama';

export interface LLMCallParams {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  signal?: AbortSignal;
}

async function callAnthropic(params: LLMCallParams): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: params.signal,
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
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
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
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
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content.trim();
}

async function callOpenAI(params: LLMCallParams): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: params.signal,
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
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

async function callOllama(params: LLMCallParams): Promise<string> {
  const baseUrl = env.OLLAMA_URL ?? 'http://localhost:11434';
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    signal: params.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      stream: false,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { message: { content: string } };
  return data.message.content.trim();
}

// Single entry point for every chat-style LLM provider used across the codebase
// (classifier, answer synthesis, entity extraction) — keeps provider-specific
// fetch/header/parsing details in one place instead of duplicated per service.
export async function callChatLLM(params: LLMCallParams): Promise<string> {
  switch (params.provider) {
    case 'ollama':
      return callOllama(params);
    case 'anthropic':
      return callAnthropic(params);
    case 'openai':
      return callOpenAI(params);
    case 'openrouter':
      return callOpenRouter(params);
  }
}

// ─── Streaming ──────────────────────────────────────────────────────────────
// Yields answer text incrementally. Consumers (SSE endpoint) forward each delta
// to the client so tokens render as they arrive instead of after a full-answer
// round-trip. Provider wire formats differ: OpenAI/OpenRouter and Anthropic use
// SSE (`data: {json}\n\n`); Ollama uses newline-delimited JSON. A single line
// reader normalizes both.

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
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: params.signal,
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
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

async function* streamOllama(params: LLMCallParams): AsyncGenerator<string> {
  const baseUrl = env.OLLAMA_URL ?? 'http://localhost:11434';
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    signal: params.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      stream: true,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama stream error ${res.status}: ${await res.text()}`);
  for await (const line of readSSELines(res)) {
    try {
      const evt = JSON.parse(line) as { message?: { content?: string } };
      if (evt.message?.content) yield evt.message.content;
    } catch {
      // ignore
    }
  }
}

export function streamChatLLM(params: LLMCallParams): AsyncGenerator<string> {
  switch (params.provider) {
    case 'ollama':
      return streamOllama(params);
    case 'anthropic':
      return streamAnthropic(params);
    case 'openai':
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
      return streamOpenAICompatible(params, 'https://api.openai.com/v1/chat/completions', {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      });
    case 'openrouter':
      if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
      return streamOpenAICompatible(params, 'https://openrouter.ai/api/v1/chat/completions', {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.FRONTEND_URL,
      });
  }
}
