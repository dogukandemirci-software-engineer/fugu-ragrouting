import { RoutingEngineService } from '../../services/routing-engine.service';
import type { IVectorRepository, VectorSearchResult } from '../../interfaces/i-vector-repository';
import type { IGraphRepository, GraphSearchResult } from '../../interfaces/i-graph-repository';

const mockVector: IVectorRepository = {
  insertChunk: jest.fn(),
  deleteByDocumentId: jest.fn(),
  similaritySearch: jest.fn().mockResolvedValue([
    { chunk_id: 'c1', document_id: 'd1', content: 'test content', similarity: 0.9, metadata: {} },
  ] as VectorSearchResult[]),
};

const graphResult: GraphSearchResult = {
  nodes: [{ id: 'n1', labels: ['Document'], properties: {} }],
  edges: [],
  paths: [],
  score: 0.7,
};

const mockGraph: IGraphRepository = {
  upsertNode: jest.fn(),
  upsertEdge: jest.fn(),
  deleteByOrg: jest.fn(),
  traversalSearch: jest.fn().mockResolvedValue([graphResult]),
};

const mockGraphFailing: IGraphRepository = {
  upsertNode: jest.fn(),
  upsertEdge: jest.fn(),
  deleteByOrg: jest.fn(),
  traversalSearch: jest.fn().mockRejectedValue(new Error('Graph DB unavailable')),
};

describe('RoutingEngineService', () => {
  let engine: RoutingEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RoutingEngineService(mockVector, mockGraph);
  });

  describe('forced strategies', () => {
    it('uses only vector when forced to vector_only', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'what is machine learning',
        query_embedding: new Array(1536).fill(0),
        forced_strategy: 'vector_only',
      });

      expect(result.strategy).toBe('vector_only');
      expect(result.classifier_used).toBe('forced');
      expect(mockVector.similaritySearch).toHaveBeenCalledTimes(1);
      expect(mockGraph.traversalSearch).not.toHaveBeenCalled();
    });

    it('uses only graph when forced to graph_only', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'how does A relate to B',
        query_embedding: new Array(1536).fill(0),
        forced_strategy: 'graph_only',
      });

      expect(result.strategy).toBe('graph_only');
      expect(mockGraph.traversalSearch).toHaveBeenCalledTimes(1);
      expect(mockVector.similaritySearch).not.toHaveBeenCalled();
    });

    it('calls both repos for hybrid and computes fusion score', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'find related documents',
        query_embedding: new Array(1536).fill(0),
        forced_strategy: 'hybrid',
      });

      expect(result.strategy).toBe('hybrid');
      expect(result.fusion_score).not.toBeNull();
      expect(mockVector.similaritySearch).toHaveBeenCalledTimes(1);
      expect(mockGraph.traversalSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('rule-based classifier', () => {
    it('routes vector-heavy queries toward vector strategy', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'summarize this document, similar to that one, semantic search',
        query_embedding: new Array(1536).fill(0),
      });

      expect(['vector_only', 'hybrid']).toContain(result.strategy);
    });

    it('routes graph-heavy queries toward graph strategy', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'find path between nodes related to each other in the graph hierarchy',
        query_embedding: new Array(1536).fill(0),
      });

      expect(['graph_only', 'hybrid']).toContain(result.strategy);
    });

    it('defaults to hybrid for ambiguous queries', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'tell me something',
        query_embedding: new Array(1536).fill(0),
      });

      expect(result.strategy).toBe('hybrid');
    });
  });

  describe('graceful graph fallback', () => {
    it('falls back to vector_only when graph throws', async () => {
      engine = new RoutingEngineService(mockVector, mockGraphFailing);

      const result = await engine.route({
        org_id: 'org1',
        query: 'test query',
        query_embedding: new Array(1536).fill(0),
        forced_strategy: 'hybrid',
      });

      expect(result.strategy).toBe('vector_only');
      expect(result.explain['graph_available']).toBe(false);
      expect(result.vector_results.length).toBeGreaterThan(0);
    });
  });

  describe('explain data completeness', () => {
    it('includes all required explain fields', async () => {
      const result = await engine.route({
        org_id: 'org1',
        query: 'test',
        query_embedding: new Array(1536).fill(0),
        forced_strategy: 'vector_only',
      });

      expect(result.explain).toMatchObject({
        graph_available: expect.any(Boolean),
        vector_count: expect.any(Number),
        graph_count: expect.any(Number),
        classifier: expect.any(String),
        confidence: expect.any(Number),
        top_k: expect.any(Number),
      });
      expect(result.response_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
