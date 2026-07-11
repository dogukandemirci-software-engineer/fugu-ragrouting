import { BaseRepository } from './base.repository';
import { IVectorRepository, VectorSearchResult } from '../interfaces/i-vector-repository';

// Production embedding models cluster into a handful of standard output
// sizes (see migration 009's comment for the provider/model breakdown).
// Keying the lookup by dimension — not by provider — means a brand new
// provider almost never needs a schema change: it just needs to land on one
// of these sizes, which nearly all published embedding models do.
const EMBEDDING_DIMENSION_COLUMNS: Record<number, string> = {
  384: 'embedding_384',
  768: 'embedding_768',
  1024: 'embedding_1024',
  1536: 'embedding_1536',
  3072: 'embedding_3072',
};

function columnForDimension(dim: number): string {
  const column = EMBEDDING_DIMENSION_COLUMNS[dim];
  if (!column) {
    throw new Error(
      `Unsupported embedding dimension ${dim} — no document_chunks column for it (supported: ${Object.keys(EMBEDDING_DIMENSION_COLUMNS).join(', ')})`
    );
  }
  return column;
}

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
    const column = columnForDimension(data.embedding.length);
    const embeddingStr = `[${data.embedding.join(',')}]`;
    await this.query(
      `INSERT INTO document_chunks
         (id, document_id, organization_id, chunk_index, content, ${column}, metadata)
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
    const column = columnForDimension(params.query_embedding.length);
    const embeddingStr = `[${params.query_embedding.join(',')}]`;
    const minSim = params.min_similarity ?? 0.3;
    return this.query<VectorSearchResult>(
      `SELECT
         dc.id as chunk_id,
         dc.document_id,
         dc.content,
         1 - (dc.${column} <=> $1::vector) AS similarity,
         dc.metadata
       FROM document_chunks dc
       WHERE dc.organization_id = $2
         AND dc.${column} IS NOT NULL
         AND 1 - (dc.${column} <=> $1::vector) >= $3
       ORDER BY dc.${column} <=> $1::vector
       LIMIT $4`,
      [embeddingStr, params.organization_id, minSim, params.top_k]
    );
  }

  async findByIds(ids: string[], organization_id: string): Promise<VectorSearchResult[]> {
    if (ids.length === 0) return [];
    return this.query<VectorSearchResult>(
      `SELECT
         dc.id as chunk_id,
         dc.document_id,
         dc.content,
         1 as similarity,
         dc.metadata
       FROM document_chunks dc
       WHERE dc.id = ANY($1::uuid[])
         AND dc.organization_id = $2`,
      [ids, organization_id]
    );
  }

  async deleteByDocumentId(document_id: string, organization_id: string): Promise<void> {
    await this.query(
      'DELETE FROM document_chunks WHERE document_id = $1 AND organization_id = $2',
      [document_id, organization_id]
    );
  }
}
