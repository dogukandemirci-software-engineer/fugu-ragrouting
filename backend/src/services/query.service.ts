import { routingEngine } from './routing-engine.service';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { query as dbQuery } from '../config/database';
import { QUOTA } from '../config/constants';
import { QuotaExceededError } from '../utils/errors';
import { logger } from '../utils/logger';
import { embedSingle } from './embedding.service';

const subRepo = new SubscriptionRepository();

export interface QueryResponse {
  results: Array<{
    content: string;
    source: 'vector' | 'graph';
    score: number;
    document_id?: string;
    metadata: Record<string, unknown>;
  }>;
  explain: Record<string, unknown>;
  quota: {
    used: number;
    limit: number;
    percent: number;
    warn: boolean;
  };
}

export const QueryService = {
  async execute(params: {
    org_id: string;
    query: string;
    strategy?: 'vector_only' | 'graph_only' | 'hybrid' | 'auto';
    top_k?: number;
    api_key_id?: string;
    user_id?: string;
  }): Promise<QueryResponse> {
    // 1. Check quota
    const usage = await subRepo.getUsageForPeriod(params.org_id);
    const percentUsed = usage.query_count / usage.monthly_query_limit;

    if (percentUsed >= QUOTA.HARD_LIMIT) {
      throw new QuotaExceededError();
    }

    // 2. Get embedding for the query
    const queryEmbedding = await embedSingle(params.query);

    // 3. Route and execute
    const result = await routingEngine.route({
      org_id: params.org_id,
      query: params.query,
      query_embedding: queryEmbedding,
      forced_strategy: params.strategy,
      top_k: params.top_k,
    });

    // 4. Merge results into unified list
    const combined = [
      ...result.vector_results.map((r) => ({
        content: r.content,
        source: 'vector' as const,
        score: r.similarity,
        document_id: r.document_id,
        metadata: r.metadata,
      })),
      ...result.graph_results.map((r) => ({
        content: JSON.stringify(r),
        source: 'graph' as const,
        score: r.score,
        document_id: undefined,
        metadata: {},
      })),
    ].sort((a, b) => b.score - a.score);

    // 5. Persist query log
    await QueryService._logQuery(params, result);

    // 6. Increment usage counter
    await subRepo.incrementQueryCount(params.org_id);

    const newCount = usage.query_count + 1;
    const newPercent = newCount / usage.monthly_query_limit;

    return {
      results: combined.slice(0, params.top_k ?? 10),
      explain: result.explain,
      quota: {
        used: newCount,
        limit: usage.monthly_query_limit,
        percent: newPercent,
        warn: newPercent >= QUOTA.WARN_THRESHOLD,
      },
    };
  },

  async _logQuery(
    params: { org_id: string; query: string; api_key_id?: string; user_id?: string },
    result: Awaited<ReturnType<typeof routingEngine.route>>
  ): Promise<void> {
    await dbQuery(
      `INSERT INTO query_logs
         (organization_id, api_key_id, user_id, query_text, routing_strategy,
          classifier_used, classifier_confidence, vector_results_count,
          graph_results_count, fusion_score, response_time_ms, explain_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        params.org_id,
        params.api_key_id ?? null,
        params.user_id ?? null,
        params.query,
        result.strategy,
        result.classifier_used,
        result.classifier_confidence,
        result.vector_results.length,
        result.graph_results.length,
        result.fusion_score,
        result.response_time_ms,
        JSON.stringify(result.explain),
      ]
    );
  },
};
