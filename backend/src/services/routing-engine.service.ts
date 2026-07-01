import { VectorRepository } from '../repositories/vector.repository';
import { GraphRepository } from '../repositories/graph.repository';
import { IVectorRepository, VectorSearchResult } from '../interfaces/i-vector-repository';
import { IGraphRepository, GraphSearchResult } from '../interfaces/i-graph-repository';
import { ROUTING_STRATEGY } from '../config/constants';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ─── Classifier Strategy (OCP: new strategies without modifying this file) ───

interface ClassificationResult {
  strategy: 'vector_only' | 'graph_only' | 'hybrid';
  confidence: number;
  classifier: string;
}

interface ClassifierStrategy {
  classify(query: string): Promise<ClassificationResult>;
}

// Rule-based: fast, no LLM call, ~100% cases where intent is clear
class RuleBasedClassifier implements ClassifierStrategy {
  private readonly graphKeywords = [
    /\b(related to|connected to|linked|depends on|relationship|how does .+ relate|who knows|path between|neighbors of|co-author|parent of|child of|is a type of|belongs to|associated with)\b/i,
    /\b(find all .+ that .+ with|traverse|graph|network|hierarchy|tree of)\b/i,
  ];

  private readonly vectorKeywords = [
    /\b(similar to|like|summarize|explain|what is|describe|overview|meaning of|about|regarding|context of|relevant|closest)\b/i,
    /\b(find documents|search for|look up|retrieve|semantic)\b/i,
  ];

  async classify(query: string): Promise<ClassificationResult> {
    const graphScore = this.graphKeywords.reduce(
      (acc, re) => acc + (re.test(query) ? 1 : 0),
      0
    );
    const vectorScore = this.vectorKeywords.reduce(
      (acc, re) => acc + (re.test(query) ? 1 : 0),
      0
    );

    const total = graphScore + vectorScore;

    if (total === 0) {
      return { strategy: 'hybrid', confidence: 0.5, classifier: 'rule_based' };
    }

    if (graphScore > vectorScore) {
      const conf = Math.min(0.5 + (graphScore - vectorScore) * 0.1, 0.95);
      return { strategy: graphScore >= 2 ? 'graph_only' : 'hybrid', confidence: conf, classifier: 'rule_based' };
    }

    if (vectorScore > graphScore) {
      const conf = Math.min(0.5 + (vectorScore - graphScore) * 0.1, 0.95);
      return { strategy: vectorScore >= 2 ? 'vector_only' : 'hybrid', confidence: conf, classifier: 'rule_based' };
    }

    return { strategy: 'hybrid', confidence: 0.6, classifier: 'rule_based' };
  }
}

const CLASSIFIER_PROMPT = `You are a query routing classifier for a RAG system.
Given a user query, classify it as ONE of: vector_only, graph_only, hybrid.

Rules:
- vector_only: semantic search, document retrieval, summarization, "what is", "explain", "find similar"
- graph_only: relationship queries, "how does X relate to Y", "path between", "connected to", "depends on", "hierarchy", "parent/child"
- hybrid: ambiguous, involves both concepts, or unclear intent

Reply with ONLY valid JSON: {"strategy":"vector_only"|"graph_only"|"hybrid","confidence":0.0-1.0}`;

class LLMClassifier implements ClassifierStrategy {
  async classify(query: string): Promise<ClassificationResult> {
    const provider = env.LLM_CLASSIFIER_PROVIDER ?? 'openai';
    logger.debug('LLM classifier invoked', { provider, query: query.substring(0, 50) });

    try {
      const raw = await this._callLLM(provider, query);
      // Extract JSON object from response (handles markdown fences and trailing text)
      const jsonMatch = raw.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error(`No JSON object found in LLM response: ${raw.substring(0, 100)}`);
      const parsed = JSON.parse(jsonMatch[0]) as { strategy: 'vector_only' | 'graph_only' | 'hybrid'; confidence: number };
      return { strategy: parsed.strategy, confidence: parsed.confidence, classifier: `llm_${provider}` };
    } catch (err) {
      logger.warn('LLM classifier failed, falling back to hybrid', { err: (err as Error).message });
      return { strategy: 'hybrid', confidence: 0.5, classifier: 'llm_fallback' };
    }
  }

  private async _callLLM(provider: string, query: string): Promise<string> {
    if (provider === 'anthropic') {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
      const model = env.LLM_CLASSIFIER_MODEL ?? 'claude-haiku-4-5-20251001';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 64,
          system: CLASSIFIER_PROMPT,
          messages: [{ role: 'user', content: query }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
      const data = await res.json() as { content: Array<{ text: string }> };
      return data.content[0].text.trim();
    }

    if (provider === 'openrouter') {
      if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
      const model = env.LLM_CLASSIFIER_MODEL ?? 'anthropic/claude-haiku-4-5';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.FRONTEND_URL,
        },
        body: JSON.stringify({
          model,
          max_tokens: 64,
          messages: [
            { role: 'system', content: CLASSIFIER_PROMPT },
            { role: 'user', content: query },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0].message.content.trim();
    }

    // Default: OpenAI
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    const model = env.LLM_CLASSIFIER_MODEL ?? 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 64,
        messages: [
          { role: 'system', content: CLASSIFIER_PROMPT },
          { role: 'user', content: query },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content.trim();
  }
}

// ─── Query Results ────────────────────────────────────────────────────────────

export interface RoutingResult {
  strategy: 'vector_only' | 'graph_only' | 'hybrid';
  classifier_used: string;
  classifier_confidence: number;
  vector_results: VectorSearchResult[];
  graph_results: GraphSearchResult[];
  fusion_score: number | null;
  response_time_ms: number;
  explain: Record<string, unknown>;
}

// ─── Routing Engine ───────────────────────────────────────────────────────────

export class RoutingEngineService {
  private readonly ruleClassifier: ClassifierStrategy = new RuleBasedClassifier();
  private readonly llmClassifier: ClassifierStrategy = new LLMClassifier();
  private readonly CONFIDENCE_THRESHOLD = 0.6;

  constructor(
    private readonly vectorRepo: IVectorRepository,
    private readonly graphRepo: IGraphRepository
  ) {}

  async route(params: {
    org_id: string;
    query: string;
    query_embedding: number[];
    forced_strategy?: 'vector_only' | 'graph_only' | 'hybrid' | 'auto';
    top_k?: number;
  }): Promise<RoutingResult> {
    const t0 = Date.now();
    const topK = params.top_k ?? 10;

    // Determine strategy
    let classification: ClassificationResult;

    if (params.forced_strategy && params.forced_strategy !== 'auto') {
      classification = {
        strategy: params.forced_strategy,
        confidence: 1.0,
        classifier: 'forced',
      };
    } else {
      classification = await this.ruleClassifier.classify(params.query);

      if (classification.confidence < this.CONFIDENCE_THRESHOLD) {
        // Low confidence → delegate to LLM, which has broader context
        const llmResult = await this.llmClassifier.classify(params.query);
        // Use LLM result unless it explicitly failed (llm_fallback)
        if (!llmResult.classifier.endsWith('_fallback')) {
          classification = llmResult;
        }
      }
    }

    const { strategy } = classification;
    let vectorResults: VectorSearchResult[] = [];
    let graphResults: GraphSearchResult[] = [];
    let graphAvailable = true;

    // Execute queries based on strategy
    if (strategy === ROUTING_STRATEGY.VECTOR_ONLY || strategy === ROUTING_STRATEGY.HYBRID) {
      vectorResults = await this.vectorRepo.similaritySearch({
        organization_id: params.org_id,
        query_embedding: params.query_embedding,
        top_k: topK,
      });
    }

    if (strategy === ROUTING_STRATEGY.GRAPH_ONLY || strategy === ROUTING_STRATEGY.HYBRID) {
      try {
        graphResults = await this.graphRepo.traversalSearch({
          org_id: params.org_id,
          query: params.query,
          depth: 2,
          top_k: topK,
        });
      } catch (err) {
        // Graceful fallback: graph unavailable → continue with vector results
        graphAvailable = false;
        logger.warn('Graph backend unavailable, falling back to vector-only', { err });
      }
    }

    // Fusion: simple score merge for hybrid results
    let fusionScore: number | null = null;
    if (strategy === ROUTING_STRATEGY.HYBRID) {
      const vectorWeight = 0.7;
      const graphWeight = 0.3;
      const avgVectorSim = vectorResults.length
        ? vectorResults.reduce((s, r) => s + r.similarity, 0) / vectorResults.length
        : 0;
      const graphScore = graphResults.length ? graphResults[0].score : 0;
      fusionScore = vectorWeight * avgVectorSim + graphWeight * graphScore;
    }

    const response_time_ms = Date.now() - t0;

    return {
      strategy: graphAvailable ? strategy : 'vector_only',
      classifier_used: classification.classifier,
      classifier_confidence: classification.confidence,
      vector_results: vectorResults,
      graph_results: graphResults,
      fusion_score: fusionScore,
      response_time_ms,
      explain: {
        forced: params.forced_strategy !== 'auto' && !!params.forced_strategy,
        graph_available: graphAvailable,
        vector_count: vectorResults.length,
        graph_count: graphResults.length,
        classifier: classification.classifier,
        confidence: classification.confidence,
        strategy_selected: strategy,
        strategy_final: graphAvailable ? strategy : 'vector_only',
        top_k: topK,
      },
    };
  }
}

// Singleton with real repositories
export const routingEngine = new RoutingEngineService(
  new VectorRepository(),
  new GraphRepository()
);
