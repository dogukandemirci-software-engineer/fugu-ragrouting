export interface Document {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  organization_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}
