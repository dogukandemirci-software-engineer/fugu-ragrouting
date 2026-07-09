import { HttpClient } from './http';
import { QueryResource } from './resources/query';
import { DocumentsResource } from './resources/documents';
import { CredentialsResource } from './resources/credentials';

export interface FuguClientOptions {
  /** API key issued from the FUGU dashboard, of the form `fugu_sk_...`. */
  apiKey: string;
  /** Base API URL. Defaults to `http://localhost:3001/api` for local dev. */
  baseUrl?: string;
  /** Custom `fetch` implementation (useful for testing or non-standard runtimes). */
  fetchImpl?: typeof fetch;
}

/**
 * Entry point for the FUGU SDK.
 *
 * ```ts
 * const client = new FuguClient({ apiKey: 'fugu_sk_...' });
 * const result = await client.query.execute('what does FUGU combine to answer questions');
 * for await (const event of client.query.stream('...')) { ... }
 * await client.documents.upload({ filename: 'doc.pdf', data: buffer });
 * const credential = await client.credentials.get();
 * ```
 */
export class FuguClient {
  readonly query: QueryResource;
  readonly documents: DocumentsResource;
  readonly credentials: CredentialsResource;

  constructor(options: FuguClientOptions) {
    if (!options.apiKey) throw new Error('FuguClient requires an apiKey');

    const http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: (options.baseUrl ?? 'http://localhost:3001/api').replace(/\/+$/, ''),
      fetchImpl: options.fetchImpl ?? fetch,
    });

    this.query = new QueryResource(http);
    this.documents = new DocumentsResource(http);
    this.credentials = new CredentialsResource(http);
  }
}
