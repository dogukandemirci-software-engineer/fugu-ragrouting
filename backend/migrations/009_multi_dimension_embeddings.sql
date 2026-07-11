-- Migration 009: dimension-keyed embedding columns.
-- document_chunks.embedding was a single vector(1536) column, implicitly
-- locking the whole platform to one embedding provider/model (OpenAI-shaped
-- output). Different providers produce genuinely incompatible vector spaces
-- even at equal dimension — direction/distance/neighborhood structure differ
-- per model — so there is no safe way to pad/truncate one provider's vector
-- into another's column. The fix is not per-provider columns (that grows
-- unbounded) but per-DIMENSION columns: production embedding models cluster
-- into a handful of standard output sizes (384: MiniLM-class models, 768:
-- Gemini text-embedding-004 / BERT-class, 1024: Cohere v3 / BGE-large /
-- GTE-large, 1536: OpenAI text-embedding-3-small / ada-002, 3072: OpenAI
-- text-embedding-3-large). A new provider almost always lands on one of
-- these sizes, so adding support is usually just a new embed<Provider>()
-- function — no schema change.
--
-- Existing 1536-dim data is preserved by copying into embedding_1536; the
-- old `embedding` column is dropped since nothing should write to it anymore.

ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_384  vector(384);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_768  vector(768);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_1024 vector(1024);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_1536 vector(1536);
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_3072 vector(3072);

UPDATE document_chunks SET embedding_1536 = embedding WHERE embedding IS NOT NULL;

ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;

-- IVFFlat indexes built per dimension column (build after data loaded, as
-- with the original single-column index — see 001_initial_schema.sql).
-- CREATE INDEX idx_chunks_embedding_384  ON document_chunks USING ivfflat (embedding_384  vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_chunks_embedding_768  ON document_chunks USING ivfflat (embedding_768  vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_chunks_embedding_1024 ON document_chunks USING ivfflat (embedding_1024 vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_chunks_embedding_1536 ON document_chunks USING ivfflat (embedding_1536 vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_chunks_embedding_3072 ON document_chunks USING ivfflat (embedding_3072 vector_cosine_ops) WITH (lists = 100);
