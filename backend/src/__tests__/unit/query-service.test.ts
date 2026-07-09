// Covers the parts of QueryService.execute() most likely to regress silently:
// the BYOK-required gate, the quota hard-limit gate, and _mergeResults()
// sorting vector+graph hits into one score-descending list.

jest.mock('../../config/database', () => ({ query: jest.fn().mockResolvedValue([]) }));
jest.mock('../../services/embedding.service', () => ({
  embedSingle: jest.fn().mockResolvedValue(new Array(4).fill(0.1)),
}));
jest.mock('../../services/routing-engine.service', () => ({
  routingEngine: { route: jest.fn() },
}));
jest.mock('../../services/answer-synthesis.service', () => ({
  AnswerSynthesisService: { synthesize: jest.fn() },
}));
jest.mock('../../services/credential.service', () => ({
  CredentialService: { getDecrypted: jest.fn() },
}));
jest.mock('../../services/email.service', () => ({
  EmailService: { sendQuotaWarning: jest.fn() },
}));
const subRepoMock = {
  getUsageForPeriod: jest.fn(),
  incrementQueryCount: jest.fn().mockResolvedValue(undefined),
  claimQuotaWarningEmail: jest.fn().mockResolvedValue(false),
};
jest.mock('../../repositories/subscription.repository', () => ({
  SubscriptionRepository: jest.fn().mockImplementation(() => subRepoMock),
}));
jest.mock('../../repositories/vector.repository', () => ({
  VectorRepository: jest.fn().mockImplementation(() => ({
    findByIds: jest.fn().mockResolvedValue([]),
  })),
}));

import { QueryService } from '../../services/query.service';
import { CredentialService } from '../../services/credential.service';
import { BYOKRequiredError, QuotaExceededError } from '../../utils/errors';

describe('QueryService.execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws BYOKRequiredError when the org has no credential configured', async () => {
    (CredentialService.getDecrypted as jest.Mock).mockResolvedValue(null);

    await expect(
      QueryService.execute({ org_id: 'org1', query: 'test query' })
    ).rejects.toThrow(BYOKRequiredError);
  });

  it('throws QuotaExceededError once usage reaches the hard limit', async () => {
    (CredentialService.getDecrypted as jest.Mock).mockResolvedValue({
      provider: 'openrouter',
      model: 'anthropic/claude-haiku-4-5',
      apiKey: 'key',
    });

    subRepoMock.getUsageForPeriod.mockResolvedValue({ query_count: 1000, monthly_query_limit: 1000 });

    await expect(
      QueryService.execute({ org_id: 'org1', query: 'test query' })
    ).rejects.toThrow(QuotaExceededError);
  });

  it('merges and sorts vector + graph results by descending score', () => {
    const merged = QueryService._mergeResults(
      {
        strategy: 'hybrid',
        classifier_used: 'forced',
        classifier_confidence: 1,
        vector_results: [
          { chunk_id: 'c1', document_id: 'd1', content: 'low score', similarity: 0.2, metadata: {} },
        ],
        graph_results: [
          { nodes: [], edges: [], paths: [], score: 0.9 },
        ],
        fusion_score: 0.5,
        response_time_ms: 10,
        explain: {},
      },
      new Map()
    );

    expect(merged).toHaveLength(2);
    expect(merged[0].source).toBe('graph');
    expect(merged[0].score).toBe(0.9);
    expect(merged[1].source).toBe('vector');
  });
});
