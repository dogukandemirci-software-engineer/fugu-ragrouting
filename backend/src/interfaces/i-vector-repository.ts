export interface VectorSearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface IVectorRepository {
  insertChunk(data: {
    id: string;
    document_id: string;
    organization_id: string;
    chunk_index: number;
    content: string;
    // Length determines which dimension-keyed column this is written to —
    // see EMBEDDING_DIMENSION_COLUMNS in vector.repository.ts.
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  similaritySearch(params: {
    organization_id: string;
    // Length determines which dimension-keyed column is searched — a search
    // only ever matches chunks embedded at the same dimension (different
    // providers/models are not comparable even at equal length, but a length
    // mismatch can't be searched at all since the column literally doesn't
    // hold vectors of that size).
    query_embedding: number[];
    top_k: number;
    min_similarity?: number;
  }): Promise<VectorSearchResult[]>;

  findByIds(ids: string[], organization_id: string): Promise<VectorSearchResult[]>;

  deleteByDocumentId(document_id: string, organization_id: string): Promise<void>;
}
