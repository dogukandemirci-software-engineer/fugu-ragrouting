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
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  similaritySearch(params: {
    organization_id: string;
    query_embedding: number[];
    top_k: number;
    min_similarity?: number;
  }): Promise<VectorSearchResult[]>;

  deleteByDocumentId(document_id: string): Promise<void>;
}
