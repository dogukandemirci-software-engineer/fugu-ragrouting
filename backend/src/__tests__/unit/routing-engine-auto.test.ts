import { RoutingEngineService } from '../../services/routing-engine.service';
import type { IVectorRepository, VectorSearchResult } from '../../interfaces/i-vector-repository';
import type { IGraphRepository } from '../../interfaces/i-graph-repository';
import * as embeddingService from '../../services/embedding.service';
import { CLASSIFIER_PROTOTYPES, type Strategy } from '../../services/embedding-centroid-classifier';

// The `auto` path defers to the embedding-centroid classifier only when the
// rule-based classifier is under the confidence threshold (ambiguous queries →
// 0.5/0.6). Mock embedBatch (the one-time prototype warm-up) so centroids are
// deterministic: each prototype maps to a one-hot vector for its class, so the
// centroids ARE those one-hot vectors, and a query vector equal to one class's
// one-hot classifies to that class with maximum margin.
jest.mock('../../services/embedding.service');
const mockedEmbedBatch = embeddingService.embedBatch as jest.MockedFunction<typeof embeddingService.embedBatch>;

const ONE_HOT: Record<Strategy, number[]> = {
  vector_only: [1, 0, 0],
  graph_only: [0, 1, 0],
  hybrid: [0, 0, 1],
};

function classOfPrototype(text: string): Strategy {
  for (const s of Object.keys(CLASSIFIER_PROTOTYPES) as Strategy[]) {
    if (CLASSIFIER_PROTOTYPES[s].includes(text)) return s;
  }
  throw new Error(`unknown prototype: ${text}`);
}

const mockVector: IVectorRepository = {
  insertChunk: jest.fn(),
  deleteByDocumentId: jest.fn(),
  findByIds: jest.fn().mockResolvedValue([]),
  similaritySearch: jest.fn().mockResolvedValue([
    { chunk_id: 'c1', document_id: 'd1', content: 'x', similarity: 0.9, metadata: {} },
  ] as VectorSearchResult[]),
};

const mockGraph: IGraphRepository = {
  upsertNode: jest.fn(),
  upsertEdge: jest.fn(),
  deleteByOrg: jest.fn(),
  traversalSearch: jest.fn().mockResolvedValue([]),
};

describe('RoutingEngineService — auto strategy centroid delegation', () => {
  let engine: RoutingEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedEmbedBatch.mockImplementation(async (texts: string[]) => texts.map((t) => ONE_HOT[classOfPrototype(t)]));
    engine = new RoutingEngineService(mockVector, mockGraph);
  });

  it('defers to the embedding-centroid classifier on a low-confidence (ambiguous) query', async () => {
    const result = await engine.route({
      org_id: 'org1',
      query: 'tell me something', // hits neither keyword set → rule confidence 0.5
      query_embedding: ONE_HOT.vector_only, // nearest to the vector_only centroid
      forced_strategy: 'auto',
    });

    expect(mockedEmbedBatch).toHaveBeenCalledTimes(1); // one-time warm-up
    expect(result.classifier_used).toBe('embedding_centroid');
    expect(result.classifier_confidence).toBeGreaterThan(0.9); // decisive margin
    expect(result.strategy).toBe('vector_only');
  });

  it('keeps the rule-based result when the centroid classifier cannot run (embedding fails)', async () => {
    mockedEmbedBatch.mockRejectedValue(new Error('embedding down'));

    const result = await engine.route({
      org_id: 'org1',
      query: 'tell me something',
      query_embedding: ONE_HOT.vector_only,
      forced_strategy: 'auto',
    });

    // Centroid warm-up failed → we do NOT overwrite the rule-based classification.
    expect(result.classifier_used).toBe('rule_based');
    expect(result.strategy).toBe('hybrid');
  });

  it('does not run the centroid classifier when the rule-based classifier is confident', async () => {
    const result = await engine.route({
      org_id: 'org1',
      query: 'find path between nodes related to each other in the graph hierarchy',
      query_embedding: ONE_HOT.graph_only,
      forced_strategy: 'auto',
    });

    expect(mockedEmbedBatch).not.toHaveBeenCalled();
    expect(result.classifier_used).toBe('rule_based');
  });
});
