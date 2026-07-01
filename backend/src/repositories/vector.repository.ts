import { BaseRepository } from './base.repository';
import { IVectorRepository, VectorSearchResult } from '../interfaces/i-vector-repository';

export class VectorRepository extends BaseRepository implements IVectorRepository {
  async insertChunk(data: {
    id: string;
    document_id: string;
    organization_id: string;
    chunk_index: number;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const embeddingStr = `[${data.embedding.join(',')}]`;
    await this.query(
      `INSERT INTO document_chunks
         (id, document_id, organization_id, chunk_index, content, embedding, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
      [
        data.id,
        data.document_id,
        data.organization_id,
        data.chunk_index,
        data.content,
        embeddingStr,
        JSON.stringify(data.metadata ?? {}),
      ]
    );
  }

  async similaritySearch(params: {
    organization_id: string;
    query_embedding: number[];
    top_k: number;
    min_similarity?: number;
  }): Promise<VectorSearchResult[]> {
    const embeddingStr = `[${params.query_embedding.join(',')}]`;
    const minSim = params.min_similarity ?? 0.3;
    return this.query<VectorSearchResult>(
      `SELECT
         dc.id as chunk_id,
         dc.document_id,
         dc.content,
         1 - (dc.embedding <=> $1::vector) AS similarity,
         dc.metadata
       FROM document_chunks dc
       WHERE dc.organization_id = $2
         AND 1 - (dc.embedding <=> $1::vector) >= $3
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $4`,
      [embeddingStr, params.organization_id, minSim, params.top_k]
    );
  }

  async deleteByDocumentId(document_id: string): Promise<void> {
    await this.query('DELETE FROM document_chunks WHERE document_id = $1', [document_id]);
  }
}
