import * as embeddingService from '../../services/embedding.service';
import {
  EmbeddingCentroidClassifier,
  CLASSIFIER_PROTOTYPES,
  type Strategy,
} from '../../services/embedding-centroid-classifier';

jest.mock('../../services/embedding.service');
const mockedEmbedBatch = embeddingService.embedBatch as jest.MockedFunction<typeof embeddingService.embedBatch>;

const ONE_HOT: Record<Strategy, number[]> = {
  vector_only: [1, 0, 0],
  graph_only: [0, 1, 0],
  hybrid: [0, 0, 1],
};

function classOf(text: string): Strategy {
  for (const s of Object.keys(CLASSIFIER_PROTOTYPES) as Strategy[]) {
    if (CLASSIFIER_PROTOTYPES[s].includes(text)) return s;
  }
  throw new Error(`unknown prototype: ${text}`);
}

describe('EmbeddingCentroidClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEmbedBatch.mockImplementation(async (texts: string[]) => texts.map((t) => ONE_HOT[classOf(t)]));
  });

  it('returns null when no embedding is provided (caller keeps rule-based result)', async () => {
    const c = new EmbeddingCentroidClassifier();
    expect(await c.classify(undefined)).toBeNull();
    expect(await c.classify([])).toBeNull();
    expect(mockedEmbedBatch).not.toHaveBeenCalled();
  });

  it('classifies a query to its nearest centroid with high confidence', async () => {
    const c = new EmbeddingCentroidClassifier();
    const res = await c.classify(ONE_HOT.graph_only);
    expect(res).not.toBeNull();
    expect(res!.strategy).toBe('graph_only');
    expect(res!.classifier).toBe('embedding_centroid');
    expect(res!.confidence).toBeGreaterThan(0.9);
  });

  it('routes to hybrid on a near-tie between two strategies', async () => {
    const c = new EmbeddingCentroidClassifier();
    // Equidistant to vector_only [1,0,0] and graph_only [0,1,0] → tiny margin.
    const res = await c.classify([1, 1, 0]);
    expect(res!.strategy).toBe('hybrid');
  });

  it('embeds prototypes only once (caches centroids across calls)', async () => {
    const c = new EmbeddingCentroidClassifier();
    await c.classify(ONE_HOT.vector_only);
    await c.classify(ONE_HOT.graph_only);
    expect(mockedEmbedBatch).toHaveBeenCalledTimes(1);
  });

  it('returns null (falls back) when the one-time prototype embedding fails', async () => {
    mockedEmbedBatch.mockRejectedValue(new Error('embedding provider down'));
    const c = new EmbeddingCentroidClassifier();
    expect(await c.classify(ONE_HOT.vector_only)).toBeNull();
  });
});
