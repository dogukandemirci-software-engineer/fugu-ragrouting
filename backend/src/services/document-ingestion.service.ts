import { v4 as uuidv4 } from 'uuid';
import { DocumentRepository } from '../repositories/document.repository';
import { VectorRepository } from '../repositories/vector.repository';
import { GraphRepository } from '../repositories/graph.repository';
import { DocumentParserService } from './document-parser.service';
import { DOCUMENT_STATUS } from '../config/constants';
import { logger } from '../utils/logger';
import { embedBatch } from './embedding.service';
import { CredentialService } from './credential.service';
import { EntityExtractionService } from './entity-extraction.service';
import { StorageService } from './storage.service';
import { env } from '../config/env';
import { enqueueIngestion } from '../queue/ingestion-queue';
import { mapWithConcurrency } from '../utils/concurrency';
import { runInOrgScope } from '../config/request-context';

const docRepo = new DocumentRepository();
const vectorRepo = new VectorRepository();
const graphRepo = new GraphRepository();

function slugifyEntity(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface ChunkRef {
  content: string;
  chunkId: string;
}

// Best-effort: extracts entity/relationship triples from each chunk and upserts
// them into the graph. Never throws — a single chunk's extraction failure, or
// the whole step being unavailable, must not fail document ingestion, since
// graph ingestion is an enrichment on top of the always-required vector index.
// Each node/edge carries the source chunk_id so query-time graph traversal can
// pull the chunk's full text back from pgvector instead of relying on the
// entity summary alone.
async function ingestGraphEntities(chunks: ChunkRef[], docId: string, orgId: string): Promise<void> {
  await mapWithConcurrency(chunks, 6, async ({ content, chunkId }) => {
    try {
      const triples = await EntityExtractionService.extractFromChunk(content);
      for (const t of triples) {
        if (!t.subject?.name || !t.object?.name || !t.predicate) continue;
        const subjId = await graphRepo.upsertNode({
          org_id: orgId,
          external_id: slugifyEntity(t.subject.name),
          labels: [t.subject.type || 'Other'],
          properties: { name: t.subject.name, document_id: docId, chunk_id: chunkId },
        });
        const objId = await graphRepo.upsertNode({
          org_id: orgId,
          external_id: slugifyEntity(t.object.name),
          labels: [t.object.type || 'Other'],
          properties: { name: t.object.name, document_id: docId, chunk_id: chunkId },
        });
        await graphRepo.upsertEdge({
          org_id: orgId,
          from_id: subjId,
          to_id: objId,
          type: t.predicate,
          properties: { document_id: docId, chunk_id: chunkId },
        });
      }
    } catch (err) {
      logger.warn('Entity extraction/graph upsert failed for chunk, continuing', {
        docId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

// Splits into paragraphs first, then greedily packs them into chunkSize-bounded
// chunks along paragraph/sentence boundaries so a chunk never starts or ends
// mid-sentence — arbitrary character-offset slicing produced unreadable,
// context-free fragments that hurt both readability and retrieval quality.
function chunkText(text: string, chunkSize = 1200, overlap = 150): string[] {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);

  // Break any paragraph that's still too long on sentence boundaries.
  const units: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      units.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [para];
    let buf = '';
    for (const sentence of sentences) {
      if (buf && (buf + sentence).length > chunkSize) {
        units.push(buf.trim());
        buf = '';
      }
      buf += sentence;
    }
    if (buf.trim()) units.push(buf.trim());
  }

  // Pack units into chunks up to chunkSize, carrying a bit of overlap for context continuity.
  const chunks: string[] = [];
  let current = '';
  for (const unit of units) {
    if (current && (current.length + unit.length + 1) > chunkSize) {
      chunks.push(current.trim());
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail + ' ' + unit;
    } else {
      current = current ? `${current}\n\n${unit}` : unit;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 0);
}

export const DocumentIngestionService = {
  /**
   * Creates a document record immediately and kicks off async processing.
   * Always returns quickly — the route responds 202, status tracked via document.status.
   */
  async ingest(params: {
    org_id: string;
    user_id?: string;
    name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    buffer: Buffer;
  }): Promise<string> {
    const doc = await docRepo.create({
      organization_id: params.org_id,
      uploaded_by: params.user_id ?? null,
      name: params.name,
      file_type: params.file_type,
      file_size: params.file_size,
      storage_path: params.storage_path,
      status: DOCUMENT_STATUS.PENDING,
      error_message: null,
      chunk_count: 0,
      metadata: {},
    });

    await DocumentIngestionService._dispatch(doc.id, params.org_id, params.buffer, params.file_type, params.name);
    return doc.id;
  },

  /**
   * Prefers the durable queue (survives restarts, at-least-once); falls back
   * to in-process fire-and-forget when the broker is unreachable so uploads
   * keep working without Redpanda running.
   */
  async _dispatch(docId: string, orgId: string, buffer: Buffer, fileType: string, name: string): Promise<void> {
    if (env.INGESTION_QUEUE_ENABLED) {
      try {
        await enqueueIngestion({ docId, orgId, attempt: 1 });
        return;
      } catch (err) {
        logger.warn('Ingestion queue unavailable, falling back to in-process processing', {
          docId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    // Fire-and-forget past the point where the HTTP response finishes —
    // orgScopeMiddleware releases the request's scoped connection on
    // res.on('finish'), so this must open its own org-scoped connection
    // rather than relying on the (possibly already-released) request scope.
    runInOrgScope(orgId, () =>
      DocumentIngestionService._processAsync(docId, buffer, fileType, name, orgId)
    ).catch((err) => {
      logger.error('Document ingestion pipeline error', {
        doc_id: docId,
        err: err instanceof Error ? err.message : String(err),
      });
    });
  },

  /**
   * Queue-worker entrypoint: loads the document, reads the persisted file
   * from storage, wipes any previously written chunks (idempotent under
   * at-least-once redelivery), then runs the normal pipeline. Throws on
   * failure so the consumer can retry/DLQ.
   */
  async processDocument(docId: string, orgId: string): Promise<void> {
    // The Kafka consumer runs with no HTTP request context, so nothing sets
    // app.current_org_id — without this, RLS-protected reads/writes on
    // `documents` silently return zero rows instead of erroring, making a
    // perfectly real document look "not found" forever.
    await runInOrgScope(orgId, async () => {
      const doc = await docRepo.findById(docId, orgId);
      if (!doc) {
        // The producer (document.controller.ts's upload handler) enqueues
        // this message from inside the same HTTP request whose transaction
        // creates the row — Kafka/Redpanda can deliver to this consumer
        // before that transaction's COMMIT is visible, so "not found" here
        // is frequently a real race, not a genuinely missing document.
        // Silently returning (treating this as done) previously dropped the
        // job forever with the document stuck in "pending" and no user-
        // visible error. Throw instead so the caller's existing
        // attempt-count retry/DLQ logic (handleIngestMessage in server.ts)
        // gives the transaction time to land before giving up.
        throw new Error(`Document ${docId} not found (org ${orgId}) — likely a commit-visibility race, will retry`);
      }
      if (doc.status === DOCUMENT_STATUS.READY) return; // duplicate delivery, already done

      const buffer = await StorageService.read(doc.storage_path);
      await vectorRepo.deleteByDocumentId(docId, orgId);
      await DocumentIngestionService._processAsync(docId, buffer, doc.file_type, doc.name, orgId);

      const after = await docRepo.findById(docId, orgId);
      if (after?.status === DOCUMENT_STATUS.FAILED) {
        throw new Error(after.error_message ?? 'Ingestion failed');
      }
    });
  },

  async _processAsync(
    docId: string,
    buffer: Buffer,
    mimeType: string,
    filename: string,
    orgId: string
  ): Promise<void> {
    await docRepo.updateStatus(docId, orgId, DOCUMENT_STATUS.PROCESSING);

    try {
      // 1. Parse file into plain text
      const parsed = await DocumentParserService.parse(buffer, mimeType, filename);
      const rawText = parsed.text;

      // Update metadata with parser info
      await docRepo.updateMetadata(docId, orgId, parsed.metadata);

      if (!rawText || rawText.trim().length === 0) {
        // Empty content: mark ready with 0 chunks (not an error)
        await docRepo.updateChunkCount(docId, orgId, 0);
        await docRepo.updateStatus(docId, orgId, DOCUMENT_STATUS.READY);
        return;
      }

      // 2. Chunk
      const chunks = chunkText(rawText);

      // Use the org's BYOK credential for embedding when its provider matches
      // the configured EMBEDDING_PROVIDER, falling back to the static env key
      // otherwise — orgs without any BYOK credential configured still ingest
      // fine off the platform default.
      const credential = await CredentialService.getDecrypted(orgId);

      // 3. Embed + insert in batches of 20, with up to 3 batches in flight at once —
      // large documents (hundreds of chunks) previously ran every batch strictly
      // sequentially, which meant ingestion time scaled linearly with document size.
      const batchSize = 20;
      const batches: string[][] = [];
      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize));
      }

      const chunkRefsByBatch = await mapWithConcurrency(batches, 3, async (batch, batchIdx) => {
        const embeddings = await embedBatch(batch, credential);
        const refs: ChunkRef[] = [];
        for (let j = 0; j < batch.length; j++) {
          const chunkId = uuidv4();
          await vectorRepo.insertChunk({
            id: chunkId,
            document_id: docId,
            organization_id: orgId,
            chunk_index: batchIdx * batchSize + j,
            content: batch[j],
            embedding: embeddings[j],
          });
          refs.push({ content: batch[j], chunkId });
        }
        return refs;
      });
      const chunkRefs = chunkRefsByBatch.flat();

      await docRepo.updateChunkCount(docId, orgId, chunks.length);

      // 4. Graph enrichment (best-effort, never fails the document)
      if (env.ENTITY_EXTRACTION_ENABLED) {
        await ingestGraphEntities(chunkRefs, docId, orgId);
      }

      await docRepo.updateStatus(docId, orgId, DOCUMENT_STATUS.READY);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during ingestion';
      logger.warn('Document ingestion failed', { docId, message });
      await docRepo.updateStatus(docId, orgId, DOCUMENT_STATUS.FAILED, message);
    }
  },

  // Retriable from FAILED (ingestion ran and errored) or PENDING (the queue
  // message was never delivered/consumed — e.g. a lost message during a
  // broker restart — so the document never even reached PROCESSING).
  // Returns whether a retry was actually dispatched so the endpoint can be
  // honest instead of always claiming success.
  async retry(docId: string, orgId: string): Promise<boolean> {
    const doc = await docRepo.findById(docId, orgId);
    if (!doc || (doc.status !== DOCUMENT_STATUS.FAILED && doc.status !== DOCUMENT_STATUS.PENDING)) {
      return false;
    }

    logger.info('Retrying document ingestion', { docId, previousStatus: doc.status });
    const buffer = await StorageService.read(doc.storage_path);
    await DocumentIngestionService._dispatch(docId, orgId, buffer, doc.file_type, doc.name);
    return true;
  },
};
