import { embedBatch } from './embedding.service';
import { env } from '../config/env';
import { ROUTING } from '../config/constants';
import { logger } from '../utils/logger';
import type { LLMCredentialDecrypted } from '../entities/credential.entity';

// ─── Embedding-centroid query classifier ────────────────────────────────────
//
// Classifies a query into a routing strategy WITHOUT any LLM call. The query
// embedding is already computed for retrieval; here we compare it (cosine) to
// one prototype centroid per strategy and pick the nearest. This makes routing
// classification free (no extra API call), fast (pure vector math), semantic,
// and multilingual — replacing the previous paid OpenRouter LLM classifier.
//
// The embedding MODEL is platform-fixed via env (EMBEDDING_PROVIDER/
// EMBEDDING_MODEL); BYOK only supplies the API key, not the model. So every
// org's query vector lives in the same space, and a single set of centroids
// (computed once per process) matches all of them.

export type Strategy = 'vector_only' | 'graph_only' | 'hybrid';

export interface CentroidClassification {
  strategy: Strategy;
  confidence: number;
  classifier: string;
}

// Labeled prototype queries per strategy. Semantics — not keywords — drive the
// match, so a handful of varied phrasings per class generalizes well; English +
// Turkish phrasings are included so the centroids serve both languages.
export const CLASSIFIER_PROTOTYPES: Record<Strategy, string[]> = {
  vector_only: [
    'What is our refund policy?',
    'Summarize the onboarding guide',
    'Explain how the billing system works',
    'Find documents about data retention',
    'Give me an overview of the security whitepaper',
    'What does the API rate limit section say?',
    'İade politikamız nedir?',
    'Sözleşmenin gizlilik bölümünü özetle',
  ],
  graph_only: [
    'How is the billing service connected to the auth service?',
    'What depends on the payment module?',
    'Show the relationship between vendor X and our suppliers',
    'Who reports to the engineering manager?',
    'Find the path between the API gateway and the database',
    'Which components are linked to the notification service?',
    'Auth servisi hangi servislerle bağlantılı?',
    'X tedarikçisi ile ekiplerimiz arasındaki ilişki nedir?',
  ],
  hybrid: [
    'Summarize what we know about vendor X and how they relate to our supply chain',
    'Explain the auth service and what other services depend on it',
    'Tell me about the refund process and which teams are involved',
    'What is the payment flow and how are its components connected?',
    'Vendor X hakkında bilgi ver ve tedarik zincirimizle ilişkisini göster',
  ],
};

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

interface Centroid {
  strategy: Strategy;
  vector: number[];
}

export class EmbeddingCentroidClassifier {
  private centroids: Centroid[] | null = null;
  private centroidKey: string | null = null;
  private warming: Promise<void> | null = null;

  private currentKey(): string {
    return `${env.EMBEDDING_PROVIDER}:${env.EMBEDDING_MODEL}`;
  }

  // Embed the prototypes once per process (re-warmed if the embedding config
  // changes). Concurrent first-queries share a single in-flight warm-up. A
  // failed warm-up resets `warming` so the next query retries rather than
  // caching a broken state.
  private async ensureCentroids(credential?: LLMCredentialDecrypted | null): Promise<void> {
    const key = this.currentKey();
    if (this.centroids && this.centroidKey === key) return;
    if (!this.warming) {
      this.warming = (async () => {
        const strategies = Object.keys(CLASSIFIER_PROTOTYPES) as Strategy[];
        const texts: string[] = [];
        const owners: Strategy[] = [];
        for (const s of strategies) {
          for (const t of CLASSIFIER_PROTOTYPES[s]) {
            texts.push(t);
            owners.push(s);
          }
        }
        const vectors = await embedBatch(texts, credential);
        const sums = new Map<Strategy, { acc: number[]; n: number }>();
        vectors.forEach((v, i) => {
          const s = owners[i];
          const cur = sums.get(s) ?? { acc: new Array(v.length).fill(0), n: 0 };
          for (let d = 0; d < v.length; d++) cur.acc[d] += v[d];
          cur.n++;
          sums.set(s, cur);
        });
        this.centroids = strategies.map((s) => {
          const { acc, n } = sums.get(s)!;
          return { strategy: s, vector: acc.map((x) => x / n) };
        });
        this.centroidKey = key;
      })().finally(() => {
        this.warming = null;
      });
    }
    await this.warming;
  }

  // Returns null when classification can't run (no embedding, or the one-time
  // prototype embedding failed) so the caller can keep its rule-based result.
  async classify(
    embedding: number[] | undefined,
    credential?: LLMCredentialDecrypted | null
  ): Promise<CentroidClassification | null> {
    if (!embedding || embedding.length === 0) return null;
    try {
      await this.ensureCentroids(credential);
    } catch (err) {
      logger.warn('Embedding-centroid classifier unavailable (prototype embedding failed)', {
        err: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
    if (!this.centroids) return null;

    const sims = this.centroids
      .map((c) => ({ strategy: c.strategy, sim: cosine(embedding, c.vector) }))
      .sort((a, b) => b.sim - a.sim);

    const top = sims[0];
    const margin = top.sim - (sims[1]?.sim ?? 0);
    const confidence = Math.min(
      ROUTING.CENTROID_CONFIDENCE_CAP,
      Math.max(
        ROUTING.CENTROID_CONFIDENCE_FLOOR,
        ROUTING.CENTROID_CONFIDENCE_FLOOR + margin * ROUTING.CENTROID_MARGIN_SCALE
      )
    );
    // Near-tie between the two closest strategies → the query genuinely spans
    // both; route hybrid instead of committing to a shaky single-path winner.
    const strategy: Strategy = margin < ROUTING.CENTROID_MIN_MARGIN_FOR_SINGLE ? 'hybrid' : top.strategy;

    return { strategy, confidence, classifier: 'embedding_centroid' };
  }
}
