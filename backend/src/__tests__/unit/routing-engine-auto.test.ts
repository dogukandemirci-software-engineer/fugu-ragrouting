import { RoutingEngineService } from '../../services/routing-engine.service';
import type { IVectorRepository, VectorSearchResult } from '../../interfaces/i-vector-repository';
import type { IGraphRepository } from '../../interfaces/i-graph-repository';
import * as llmClient from '../../utils/llm-client';

// The `auto` path delegates to the LLM classifier only when the rule-based
// classifier is under the confidence threshold (ambiguous queries → 0.5/0.6).
// Mock the single LLM entry point so we can assert delegation without a network
// call, and confirm a clear-intent query short-circuits before ever reaching it.
jest.mock('../../utils/llm-client');
const mockedCallChatLLM = llmClient.callChatLLM as jest.MockedFunction<typeof llmClient.callChatLLM>;

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

describe('RoutingEngineService — auto strategy LLM delegation', () => {
  let engine: RoutingEngineService;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RoutingEngineService(mockVector, mockGraph);
  });

  it('delegates to the LLM classifier on a low-confidence (ambiguous) query', async () => {
    mockedCallChatLLM.mockResolvedValue('{"strategy":"graph_only","confidence":0.88}');

    const result = await engine.route({
      org_id: 'org1',
      query: 'tell me something', // hits neither keyword set → rule confidence 0.5
      query_embedding: new Array(1536).fill(0),
      forced_strategy: 'auto',
    });

    expect(mockedCallChatLLM).toHaveBeenCalledTimes(1);
    expect(result.classifier_used).toMatch(/^llm_/);
    expect(result.classifier_confidence).toBeCloseTo(0.88);
  });

  it('keeps the rule-based result when the LLM classifier fails (fallback)', async () => {
    mockedCallChatLLM.mockRejectedValue(new Error('LLM down'));

    const result = await engine.route({
      org_id: 'org1',
      query: 'tell me something',
      query_embedding: new Array(1536).fill(0),
      forced_strategy: 'auto',
    });

    // LLM failed → we do NOT overwrite the rule-based classification.
    expect(result.classifier_used).toBe('rule_based');
    expect(result.strategy).toBe('hybrid');
  });

  it('does not call the LLM when the rule-based classifier is confident', async () => {
    const result = await engine.route({
      org_id: 'org1',
      query: 'find path between nodes related to each other in the graph hierarchy',
      query_embedding: new Array(1536).fill(0),
      forced_strategy: 'auto',
    });

    expect(mockedCallChatLLM).not.toHaveBeenCalled();
    expect(result.classifier_used).toBe('rule_based');
  });
});
