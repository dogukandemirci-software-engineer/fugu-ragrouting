import { BaseRepository } from './base.repository';
import { Document } from '../entities/document.entity';
import { PAGINATION } from '../config/constants';

export class DocumentRepository extends BaseRepository {
  async findById(id: string, orgId: string): Promise<Document | null> {
    return this.queryOne<Document>(
      'SELECT * FROM documents WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
  }

  async list(orgId: string, options?: { limit?: number; offset?: number }): Promise<Document[]> {
    const limit = options?.limit ?? PAGINATION.DEFAULT_LIMIT;
    const offset = options?.offset ?? 0;
    return this.query<Document>(
      'SELECT * FROM documents WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [orgId, limit, offset]
    );
  }

  async create(data: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const doc = await this.queryOne<Document>(
      `INSERT INTO documents
         (organization_id, uploaded_by, name, file_type, file_size, storage_path, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.organization_id,
        data.uploaded_by,
        data.name,
        data.file_type,
        data.file_size,
        data.storage_path,
        data.status,
        JSON.stringify(data.metadata),
      ]
    );
    return doc!;
  }

  async updateStatus(id: string, status: Document['status'], errorMessage?: string): Promise<void> {
    await this.query(
      `UPDATE documents SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMessage ?? null, id]
    );
  }

  async updateChunkCount(id: string, count: number): Promise<void> {
    await this.query(
      'UPDATE documents SET chunk_count = $1, updated_at = NOW() WHERE id = $2',
      [count, id]
    );
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.query(
      'DELETE FROM documents WHERE id = $1 AND organization_id = $2',
      [id, orgId]
    );
  }
}
