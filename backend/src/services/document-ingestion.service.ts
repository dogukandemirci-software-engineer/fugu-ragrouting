import { v4 as uuidv4 } from 'uuid';
import { DocumentRepository } from '../repositories/document.repository';
import { VectorRepository } from '../repositories/vector.repository';
import { DOCUMENT_STATUS } from '../config/constants';
import { logger } from '../utils/logger';
import { embedBatch } from './embedding.service';

const docRepo = new DocumentRepository();
const vectorRepo = new VectorRepository();

// Naive text splitter: split on double newline or every ~500 tokens (~2000 chars)
function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}


export const DocumentIngestionService = {
  async ingest(params: {
    org_id: string;
    user_id: string;
    name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    raw_text: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    // 1. Create document record (pending)
    const doc = await docRepo.create({
      organization_id: params.org_id,
      uploaded_by: params.user_id,
      name: params.name,
      file_type: params.file_type,
      file_size: params.file_size,
      storage_path: params.storage_path,
      status: DOCUMENT_STATUS.PENDING,
      error_message: null,
      chunk_count: 0,
      metadata: params.metadata ?? {},
    });

    // 2. Process asynchronously (in real prod: push to a queue)
    DocumentIngestionService._processAsync(doc.id, params.raw_text, params.org_id).catch((err) => {
      logger.error('Document ingestion failed', { doc_id: doc.id, err });
    });

    return doc.id;
  },

  async _processAsync(docId: string, rawText: string, orgId: string): Promise<void> {
    await docRepo.updateStatus(docId, DOCUMENT_STATUS.PROCESSING);

    try {
      const chunks = chunkText(rawText);

      // Embed in batches of 20 (OpenAI limit is 2048 inputs, but keep batch small)
      const batchSize = 20;
      let chunkIndex = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await embedBatch(batch);

        for (let j = 0; j < batch.length; j++) {
          await vectorRepo.insertChunk({
            id: uuidv4(),
            document_id: docId,
            organization_id: orgId,
            chunk_index: chunkIndex++,
            content: batch[j],
            embedding: embeddings[j],
          });
        }
      }

      await docRepo.updateChunkCount(docId, chunks.length);
      await docRepo.updateStatus(docId, DOCUMENT_STATUS.READY);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during ingestion';
      await docRepo.updateStatus(docId, DOCUMENT_STATUS.FAILED, message);
      throw err;
    }
  },

  async retry(docId: string, orgId: string): Promise<void> {
    const doc = await docRepo.findById(docId, orgId);
    if (!doc || doc.status !== DOCUMENT_STATUS.FAILED) return;

    // Re-trigger from storage_path — actual implementation would re-download from Supabase Storage
    logger.info('Retrying document ingestion', { docId });
    await docRepo.updateStatus(docId, DOCUMENT_STATUS.PENDING);
    // TODO: trigger re-download and re-process from doc.storage_path
  },
};
