import { env } from '../config/env';
import { logger } from '../utils/logger';
import { callChatLLM } from '../utils/llm-client';

export interface ExtractedTriple {
  subject: { name: string; type: string };
  predicate: string;
  object: { name: string; type: string };
}

const EXTRACTION_SYSTEM_PROMPT = `Extract factual entity relationships from the given text as (subject, predicate, object) triples suitable for a knowledge graph. Only extract relationships explicitly stated or clearly implied in the text — do not infer speculative connections.

Rules:
- subject/object: short canonical names (e.g. "Marie Curie" not "she" or "the scientist mentioned above")
- subject/object type: one of Person, Organization, Location, Concept, Product, Event, Other
- predicate: an UPPER_SNAKE_CASE relationship verb, e.g. WORKS_AT, LOCATED_IN, PART_OF, RELATED_TO, AUTHORED_BY
- Extract at most 8 triples. If the text contains no clear factual relationships, return an empty array.
- Every subject and object MUST have a real, specific name copied from the text. Never write "..." or leave name empty.

Reply with ONLY valid JSON, no other text. Example for "Marie Curie discovered radium.":
{"triples":[{"subject":{"name":"Marie Curie","type":"Person"},"predicate":"DISCOVERED","object":{"name":"radium","type":"Product"}}]}`;

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openrouter: 'anthropic/claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  ollama: 'qwen2.5:0.5b',
};

// Small/quantized models (e.g. qwen2.5:0.5b) frequently ignore the exact
// {name, type} shape asked for in the prompt and instead emit the entity
// type as the key, e.g. {"person": "Alice Johnson"} instead of
// {"name": "Alice Johnson", "type": "Person"}. Normalize both shapes rather
// than silently dropping every triple a weak model produces.
function normalizeEntity(raw: unknown): { name: string; type: string } | null {
  if (typeof raw === 'string' && raw.trim() && raw.trim() !== '...') return { name: raw.trim(), type: 'Other' };
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name === 'string' && obj.name.trim() && obj.name.trim() !== '...') {
    return { name: obj.name.trim(), type: typeof obj.type === 'string' && obj.type.trim() ? obj.type.trim() : 'Other' };
  }
  // Fallback: single unexpected key whose value is the entity name, key is the type
  const entries = Object.entries(obj).filter(([, v]) => typeof v === 'string' && v.trim());
  if (entries.length === 1) {
    const [type, name] = entries[0];
    return { name: (name as string).trim(), type };
  }
  return null;
}

// Extracts each top-level {...} object from the raw response individually
// rather than JSON.parse-ing the whole payload. Small/quantized models
// (e.g. qwen2.5:0.5b) reliably produce well-formed individual triple objects
// but frequently wrap them in malformed outer syntax — a bare array instead
// of {"triples":[...]}, stray quotes between array elements, missing commas.
// Parsing object-by-object survives all of that; only a single-triple parse
// failure is lost instead of the whole response.
function extractTripleObjects(raw: string): Array<{ subject: unknown; predicate: unknown; object: unknown }> {
  const results: Array<{ subject: unknown; predicate: unknown; object: unknown }> = [];
  // Scan for every balanced {...} span containing a "subject" key — tolerates
  // nested object or bare-string subject/object values, and ignores malformed
  // syntax between spans (stray quotes, missing commas) since each span is
  // parsed independently.
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '{') continue;
    let depth = 0;
    let end = -1;
    for (let j = i; j < raw.length; j++) {
      if (raw[j] === '{') depth++;
      else if (raw[j] === '}') {
        depth--;
        if (depth === 0) { end = j; break; }
      }
    }
    if (end === -1) break;
    const span = raw.slice(i, end + 1);
    if (span.includes('"subject"')) {
      try {
        const obj = JSON.parse(span);
        if (obj && typeof obj === 'object' && 'subject' in obj && 'object' in obj) results.push(obj);
      } catch {
        // skip malformed individual triple, other triples in the response are unaffected
      }
    }
  }
  return results;
}

export const EntityExtractionService = {
  async extractFromChunk(chunkText: string): Promise<ExtractedTriple[]> {
    try {
      const provider = env.ENTITY_EXTRACTION_PROVIDER;
      const raw = await callChatLLM({
        provider,
        model: env.ENTITY_EXTRACTION_MODEL ?? DEFAULT_MODELS[provider],
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userMessage: chunkText,
        maxTokens: env.ENTITY_EXTRACTION_MAX_TOKENS,
      });

      const rawTriples = extractTripleObjects(raw);
      if (rawTriples.length === 0) return [];

      const normalized: ExtractedTriple[] = [];
      for (const t of rawTriples) {
        const subject = normalizeEntity(t.subject);
        const object = normalizeEntity(t.object);
        const predicate = typeof t.predicate === 'string' ? t.predicate.trim().toUpperCase().replace(/\s+/g, '_') : '';
        if (!subject || !object || !predicate) continue;
        normalized.push({ subject, predicate, object });
      }
      return normalized;
    } catch (err) {
      logger.warn('Entity extraction failed for chunk, skipping', {
        err: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  },
};
