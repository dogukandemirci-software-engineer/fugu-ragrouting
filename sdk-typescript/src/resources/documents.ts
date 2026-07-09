import { HttpClient } from '../http';
import type { DocumentUploadResponse, FuguDocument, ListDocumentsOptions } from '../types';

export interface UploadFileInput {
  /** File name including extension, used for type detection server-side. */
  filename: string;
  /** File contents. Accepts a Blob/File (browser) or a Buffer/Uint8Array (Node). */
  data: Blob | Buffer | Uint8Array;
  /** Optional MIME type; inferred by the platform's Blob implementation if omitted. */
  contentType?: string;
}

export class DocumentsResource {
  constructor(private readonly http: HttpClient) {}

  async list(options: ListDocumentsOptions = {}): Promise<FuguDocument[]> {
    const res = await this.http.requestJson<{ documents: FuguDocument[] }>('/documents', {
      method: 'GET',
      query: { limit: options.limit, offset: options.offset },
      signal: options.signal,
    });
    return res.documents;
  }

  async get(id: string, signal?: AbortSignal): Promise<FuguDocument> {
    const res = await this.http.requestJson<{ document: FuguDocument }>(`/documents/${encodeURIComponent(id)}`, {
      method: 'GET',
      signal,
    });
    return res.document;
  }

  /** Uploads a document (multipart/form-data, field name `file`). 50MB limit. */
  async upload(file: UploadFileInput, signal?: AbortSignal): Promise<DocumentUploadResponse> {
    const form = new FormData();
    const blob =
      file.data instanceof Blob ? file.data : new Blob([new Uint8Array(file.data)], { type: file.contentType });
    form.append('file', blob, file.filename);

    return this.http.requestForm<DocumentUploadResponse>('/documents', {
      method: 'POST',
      form,
      signal,
    });
  }

  async delete(id: string, signal?: AbortSignal): Promise<void> {
    await this.http.requestVoid(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
  }

  /** Re-queues a failed or pending document for ingestion. */
  async retry(id: string, signal?: AbortSignal): Promise<{ status: 'pending' }> {
    return this.http.requestJson<{ status: 'pending' }>(`/documents/${encodeURIComponent(id)}/retry`, {
      method: 'POST',
      signal,
    });
  }
}
