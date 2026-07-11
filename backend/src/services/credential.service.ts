import { env } from '../config/env';
import { CredentialRepository } from '../repositories/credential.repository';
import { LLMCredentialProvider, LLMCredentialDisplay, LLMCredentialDecrypted } from '../entities/credential.entity';
import { callChatLLM } from '../utils/llm-client';
import { ValidationError } from '../utils/errors';
import { parseMasterKey, encryptCredential, decryptCredential } from '../utils/credential-crypto.util';
import { logger } from '../utils/logger';

const credentialRepo = new CredentialRepository();

// Maps a raw provider error (which may embed upstream response bodies —
// quota figures, account/project identifiers, internal doc links) to a
// short, safe classification. Provider fetch helpers throw
// `Error(\`<Provider> error <status>: <raw response text>\`)` — extract only
// the status code and never let the raw text reach the client, since it is
// untrusted third-party output attacker/provider-controlled content, not
// something we've validated for safe display.
function classifyVerificationFailure(provider: LLMCredentialProvider, err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  const statusMatch = message.match(/\berror (\d{3}):/i);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;

  switch (status) {
    case 401:
    case 403:
      return `This ${provider} API key was rejected as invalid — check that it was copied correctly.`;
    case 429:
      return `This ${provider} API key is currently rate-limited or over its quota. Verify your plan/billing on the provider's dashboard and try again shortly.`;
    case 404:
      return `This ${provider} key is valid, but the model or endpoint could not be found. Check the model name.`;
    default:
      return `Could not verify this ${provider} key — the provider did not accept the test request. Double-check the key and model, then try again.`;
  }
}

// Minimal real API call to confirm the key is valid before it's ever stored.
async function testCredential(provider: LLMCredentialProvider, model: string, apiKey: string): Promise<void> {
  try {
    await callChatLLM({
      provider,
      model,
      systemPrompt: 'Reply with the single word: ok',
      userMessage: 'ping',
      // Mandatory-reasoning models can consume a small budget entirely on
      // hidden reasoning tokens before emitting any visible content — give
      // enough headroom that the test call reflects a real invalid key
      // rather than an undersized budget.
      maxTokens: 64,
      apiKey,
    });
  } catch (err) {
    logger.warn('Credential verification failed', {
      provider,
      model,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new ValidationError(classifyVerificationFailure(provider, err));
  }
}

export const CredentialService = {
  async save(orgId: string, provider: LLMCredentialProvider, model: string, apiKey: string): Promise<LLMCredentialDisplay> {
    await testCredential(provider, model, apiKey);

    const { ciphertext, iv, authTag } = encryptCredential(apiKey, parseMasterKey(env.CREDENTIAL_ENCRYPTION_KEY));
    const row = await credentialRepo.upsert({
      organization_id: orgId,
      provider,
      model,
      encrypted_api_key: ciphertext,
      key_iv: iv,
      key_auth_tag: authTag,
      key_last_four: apiKey.slice(-4),
      last_verified_at: new Date(),
    });

    return {
      provider: row.provider,
      model: row.model,
      keyLastFour: row.key_last_four,
      lastVerifiedAt: row.last_verified_at,
    };
  },

  async getDecrypted(orgId: string): Promise<LLMCredentialDecrypted | null> {
    const row = await credentialRepo.findByOrg(orgId);
    if (!row) return null;
    return {
      provider: row.provider,
      model: row.model,
      apiKey: decryptCredential(row.encrypted_api_key, row.key_iv, row.key_auth_tag, parseMasterKey(env.CREDENTIAL_ENCRYPTION_KEY)),
    };
  },

  async getDisplay(orgId: string): Promise<LLMCredentialDisplay | null> {
    const row = await credentialRepo.findByOrg(orgId);
    if (!row) return null;
    return {
      provider: row.provider,
      model: row.model,
      keyLastFour: row.key_last_four,
      lastVerifiedAt: row.last_verified_at,
    };
  },

  async remove(orgId: string): Promise<void> {
    await credentialRepo.remove(orgId);
  },
};
