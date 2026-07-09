import { HttpClient } from '../http';
import type { CredentialDisplay, CredentialModel, LLMCredentialProvider, SaveCredentialInput } from '../types';

export class CredentialsResource {
  constructor(private readonly http: HttpClient) {}

  /** Returns the organization's configured BYOK credential, or `null` if none is set. */
  async get(signal?: AbortSignal): Promise<CredentialDisplay | null> {
    const res = await this.http.requestJson<{ credential: CredentialDisplay | null }>('/organization/llm-credential', {
      method: 'GET',
      signal,
    });
    return res.credential;
  }

  /** Lists available models for a provider, including free-tier availability. */
  async listModels(provider: LLMCredentialProvider, signal?: AbortSignal): Promise<CredentialModel[]> {
    const res = await this.http.requestJson<{ models: CredentialModel[] }>('/organization/llm-credential/models', {
      method: 'GET',
      query: { provider },
      signal,
    });
    return res.models;
  }

  /** Saves (creates or replaces) the organization's BYOK credential. Validates the key with a real test call server-side. */
  async save(input: SaveCredentialInput, signal?: AbortSignal): Promise<CredentialDisplay> {
    const res = await this.http.requestJson<{ credential: CredentialDisplay }>('/organization/llm-credential', {
      method: 'PUT',
      body: input,
      signal,
    });
    return res.credential;
  }

  async remove(signal?: AbortSignal): Promise<void> {
    await this.http.requestVoid('/organization/llm-credential', { method: 'DELETE', signal });
  }
}
