import { routingEngine } from './routing-engine.service';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { VectorRepository } from '../repositories/vector.repository';
import { query as dbQuery } from '../config/database';
import { QUOTA } from '../config/constants';
import { QuotaExceededError, BYOKRequiredError } from '../utils/errors';
import { AnswerSynthesisService, SourceChunk } from './answer-synthesis.service';
import { CredentialService } from './credential.service';
import { embedSingle } from './embedding.service';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';
import type { GraphSearchResult } from '../interfaces/i-graph-repository';

const subRepo = new SubscriptionRepository();
const vectorRepo = new VectorRepository();

export interface QueryResponse {
  answer: string;
  citations: string[];
  answer_degraded: boolean;
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

// Graph results carry structured nodes/edges — render them as readable text
// for both display and synthesis input, instead of dumping the raw object.
function describeGraphResult(r: GraphSearchResult): string {
  if (r.nodes.length === 0 && r.edges.length === 0) return 'No graph entities found.';

  const nodeDescriptions = r.nodes.map((n) => {
    const name = (n.properties?.name as string) ?? n.id;
    const label = n.labels[0] ?? 'Entity';
    return `${name} (${label})`;
  });

  const edgeDescriptions = r.edges.map((e) => {
    const fromNode = r.nodes.find((n) => n.id === e.start_node_id);
    const toNode = r.nodes.find((n) => n.id === e.end_node_id);
    const fromName = (fromNode?.properties?.name as string) ?? e.start_node_id;
    const toName = (toNode?.properties?.name as string) ?? e.end_node_id;
    return `${fromName} --[${e.type}]--> ${toName}`;
  });

  const parts: string[] = [];
  if (nodeDescriptions.length) parts.push(`Entities: ${nodeDescriptions.join(', ')}`);
  if (edgeDescriptions.length) parts.push(`Relationships: ${edgeDescriptions.join('; ')}`);
  return parts.join('\n');
}

// Graph nodes/edges only store an entity summary + the source chunk_id — the
// full chunk text lives in pgvector. Pull it back so synthesis gets the real
// passage instead of just entity names and relationship labels.
function collectChunkIds(results: GraphSearchResult[]): string[] {
  const ids = new Set<string>();
  for (const r of results) {
    for (const n of r.nodes) {
      const chunkId = n.properties?.chunk_id;
      if (typeof chunkId === 'string') ids.add(chunkId);
    }
  }
  return [...ids];
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
    // Fail fast before spending any retrieval work if the org has no BYOK
    // credential configured — synthesis cannot run without one. Fetched
    // before embedding so the org's own key (if its provider matches the
    // configured embedding provider) is used instead of the static env key.
    const credential = await CredentialService.getDecrypted(params.org_id);
    if (!credential) throw new BYOKRequiredError();

    // 1. Check quota and embed the query in parallel — independent work, and
    //    embedding is the slowest external call. If the quota check throws, the
    //    embedding promise is discarded (its rejection is caught below so it
    //    never surfaces as an unhandled rejection).
    const embeddingPromise = embedSingle(params.query, credential);
    embeddingPromise.catch(() => undefined); // swallow if quota short-circuits

    const usage = await subRepo.getUsageForPeriod(params.org_id);
    const percentUsed = usage.query_count / usage.monthly_query_limit;

    if (percentUsed >= QUOTA.HARD_LIMIT) {
      throw new QuotaExceededError();
    }

    // 2. Await the embedding started above
    const queryEmbedding = await embeddingPromise;

    // 3. Route and execute
    const result = await routingEngine.route({
      org_id: params.org_id,
      query: params.query,
      query_embedding: queryEmbedding,
      forced_strategy: params.strategy,
      top_k: params.top_k,
    });

    // 4. Enrich graph results with the actual chunk text from pgvector — graph
    // nodes only carry an entity summary + chunk_id pointer, not full content.
    const graphChunkIds = collectChunkIds(result.graph_results);
    const graphChunks = graphChunkIds.length > 0
      ? await vectorRepo.findByIds(graphChunkIds, params.org_id)
      : [];
    const chunkContentById = new Map(graphChunks.map((c) => [c.chunk_id, c.content]));

    // 5. Merge results into unified list
    const topResults = QueryService._mergeResults(result, chunkContentById).slice(0, params.top_k ?? 10);

    // 6. Synthesize a grounded, formatted answer from the top retrieved sources
    const sourceChunks: SourceChunk[] = topResults.map((r, i) => ({
      id: `S${i + 1}`,
      content: r.content,
      source: r.source,
      document_id: r.document_id,
      score: r.score,
    }));
    const synthesis = await AnswerSynthesisService.synthesize(params.query, sourceChunks, credential);

    // 7. Persist query log
    await QueryService._logQuery(params, result);

    // 8. Increment usage counter
    await subRepo.incrementQueryCount(params.org_id);

    const newCount = usage.query_count + 1;
    const newPercent = newCount / usage.monthly_query_limit;

    if (newPercent >= QUOTA.WARN_THRESHOLD) {
      void QueryService._maybeSendQuotaWarningEmail(params.org_id, newPercent);
    }

    return {
      answer: synthesis.answer,
      citations: synthesis.citations,
      answer_degraded: synthesis.degraded,
      results: topResults,
      explain: result.explain,
      quota: {
        used: newCount,
        limit: usage.monthly_query_limit,
        percent: newPercent,
        warn: newPercent >= QUOTA.WARN_THRESHOLD,
      },
    };
  },

  // Merge vector + graph hits into one score-sorted list. Graph hits are
  // enriched with the real chunk text (looked up from pgvector) since graph
  // nodes only carry an entity summary + chunk_id pointer. Shared by execute()
  // and executeStream() so both paths produce identical result lists.
  _mergeResults(
    result: Awaited<ReturnType<typeof routingEngine.route>>,
    chunkContentById: Map<string, string>
  ): QueryResponse['results'] {
    const describeGraphResultEnriched = (r: GraphSearchResult): string => {
      const summary = describeGraphResult(r);
      const passages = r.nodes
        .map((n) => (typeof n.properties?.chunk_id === 'string' ? chunkContentById.get(n.properties.chunk_id as string) : undefined))
        .filter((c): c is string => !!c);
      if (passages.length === 0) return summary;
      const uniquePassages = [...new Set(passages)];
      return `${summary}\n\nSource context:\n${uniquePassages.join('\n---\n')}`;
    };

    return [
      ...result.vector_results.map((r) => ({
        content: r.content,
        source: 'vector' as const,
        score: r.similarity ?? 0,
        document_id: r.document_id,
        metadata: r.metadata,
      })),
      ...result.graph_results.map((r) => ({
        content: describeGraphResultEnriched(r),
        source: 'graph' as const,
        score: r.score,
        document_id: undefined,
        metadata: {},
      })),
    ].sort((a, b) => b.score - a.score);
  },

  // Streaming variant of execute(): performs the same quota check + routing +
  // retrieval, yields a `meta` event (results, explain, quota) up front, then
  // streams answer text deltas, then a final `done` event with citations. The
  // SSE controller serializes each yielded event. Retrieval is identical to
  // execute() — only synthesis differs (token stream vs. single call).
  async *executeStream(params: {
    org_id: string;
    query: string;
    strategy?: 'vector_only' | 'graph_only' | 'hybrid' | 'auto';
    top_k?: number;
    api_key_id?: string;
    user_id?: string;
  }): AsyncGenerator<
    | { type: 'meta'; results: QueryResponse['results']; explain: Record<string, unknown>; quota: QueryResponse['quota'] }
    | { type: 'delta'; text: string }
    | { type: 'done'; citations: string[]; answer_degraded: boolean }
  > {
    const credential = await CredentialService.getDecrypted(params.org_id);
    if (!credential) throw new BYOKRequiredError();

    const embeddingPromise = embedSingle(params.query, credential);
    embeddingPromise.catch(() => undefined);

    const usage = await subRepo.getUsageForPeriod(params.org_id);
    if (usage.query_count / usage.monthly_query_limit >= QUOTA.HARD_LIMIT) {
      throw new QuotaExceededError();
    }
    const queryEmbedding = await embeddingPromise;

    const result = await routingEngine.route({
      org_id: params.org_id,
      query: params.query,
      query_embedding: queryEmbedding,
      forced_strategy: params.strategy,
      top_k: params.top_k,
    });

    const graphChunkIds = collectChunkIds(result.graph_results);
    const graphChunks = graphChunkIds.length > 0
      ? await vectorRepo.findByIds(graphChunkIds, params.org_id)
      : [];
    const chunkContentById = new Map(graphChunks.map((c) => [c.chunk_id, c.content]));

    const topResults = QueryService._mergeResults(result, chunkContentById).slice(0, params.top_k ?? 10);

    const newCount = usage.query_count + 1;
    const newPercent = newCount / usage.monthly_query_limit;
    const quota = {
      used: newCount,
      limit: usage.monthly_query_limit,
      percent: newPercent,
      warn: newPercent >= QUOTA.WARN_THRESHOLD,
    };

    if (newPercent >= QUOTA.WARN_THRESHOLD) {
      void QueryService._maybeSendQuotaWarningEmail(params.org_id, newPercent);
    }

    yield { type: 'meta', results: topResults, explain: result.explain, quota };

    const sourceChunks: SourceChunk[] = topResults.map((r, i) => ({
      id: `S${i + 1}`,
      content: r.content,
      source: r.source,
      document_id: r.document_id,
      score: r.score,
    }));

    // The retrieval + LLM work is already done by the time we stream deltas, so
    // the query must be logged and counted against quota even if the client
    // disconnects mid-answer — otherwise aborting the SSE connection bypasses
    // the quota counter. Run accounting in `finally` so it fires on normal
    // completion AND on generator .return() (client close). Also explicitly
    // close the inner synthesis generator so its AbortController fires and the
    // upstream LLM fetch is cancelled rather than left running.
    let synthesis: { citations: string[]; degraded: boolean } | undefined;
    const stream = AnswerSynthesisService.synthesizeStream(params.query, sourceChunks, credential);
    try {
      let next = await stream.next();
      while (!next.done) {
        yield { type: 'delta', text: next.value };
        next = await stream.next();
      }
      synthesis = next.value;
    } finally {
      await stream.return?.(undefined as never);
      await QueryService._logQuery(params, result);
      await subRepo.incrementQueryCount(params.org_id);
    }

    yield { type: 'done', citations: synthesis.citations, answer_degraded: synthesis.degraded };
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

  // Notifies the org owner once per billing period when usage crosses the
  // warn threshold — claimQuotaWarningEmail() ensures only one caller among
  // concurrent requests wins the race and actually sends the email.
  async _maybeSendQuotaWarningEmail(orgId: string, percent: number): Promise<void> {
    try {
      const claimed = await subRepo.claimQuotaWarningEmail(orgId);
      if (!claimed) return;

      const owner = await dbQuery<{ email: string }>(
        `SELECT u.email FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.organization_id = $1 AND om.role = 'owner'
         LIMIT 1`,
        [orgId]
      );
      const email = owner[0]?.email;
      if (!email) return;

      await EmailService.sendQuotaWarning(email, percent);
    } catch (err) {
      logger.error('Failed to send quota warning email', {
        org_id: orgId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
