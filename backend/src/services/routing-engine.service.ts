import { VectorRepository } from '../repositories/vector.repository';
import { GraphRepository } from '../repositories/graph.repository';
import { IVectorRepository, VectorSearchResult } from '../interfaces/i-vector-repository';
import { IGraphRepository, GraphSearchResult } from '../interfaces/i-graph-repository';
import { ROUTING_STRATEGY, ROUTING } from '../config/constants';
import { logger } from '../utils/logger';
import { EmbeddingCentroidClassifier } from './embedding-centroid-classifier';
import type { LLMCredentialDecrypted } from '../entities/credential.entity';

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
  private readonly centroidClassifier = new EmbeddingCentroidClassifier();
  private readonly CONFIDENCE_THRESHOLD = ROUTING.CONFIDENCE_THRESHOLD;

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
    // Used only to pay for the one-time prototype-embedding warm-up of the
    // centroid classifier (embedding model is platform-fixed via env).
    embed_credential?: LLMCredentialDecrypted | null;
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
        // Low confidence (ambiguous or non-English, where the keyword rules
        // score nothing) → defer to the embedding-centroid classifier, which is
        // semantic and free (reuses the query vector). Returns null only if it
        // can't run, in which case we keep the rule-based result.
        const centroidResult = await this.centroidClassifier.classify(
          params.query_embedding,
          params.embed_credential
        );
        if (centroidResult) {
          classification = centroidResult;
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

      // Classifier can mis-route to graph_only when the graph has no matching
      // entities yet (small/local classifiers, sparse graphs). Rather than
      // surface an empty answer, fall back to vector search.
      if (strategy === ROUTING_STRATEGY.GRAPH_ONLY && graphResults.length === 0) {
        vectorResults = await this.vectorRepo.similaritySearch({
          organization_id: params.org_id,
          query_embedding: params.query_embedding,
          top_k: topK,
        });
        graphAvailable = false;
      }
    }

    // Fusion: simple score merge for hybrid results
    let fusionScore: number | null = null;
    if (strategy === ROUTING_STRATEGY.HYBRID) {
      const vectorWeight = ROUTING.FUSION_VECTOR_WEIGHT;
      const graphWeight = ROUTING.FUSION_GRAPH_WEIGHT;
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
