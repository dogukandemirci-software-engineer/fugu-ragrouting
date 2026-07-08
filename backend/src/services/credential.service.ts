import { env } from '../config/env';
import { CredentialRepository } from '../repositories/credential.repository';
import { LLMCredentialProvider, LLMCredentialDisplay, LLMCredentialDecrypted } from '../entities/credential.entity';
import { callChatLLM } from '../utils/llm-client';
import { ValidationError } from '../utils/errors';
import { parseMasterKey, encryptCredential, decryptCredential } from '../utils/credential-crypto.util';

const credentialRepo = new CredentialRepository();

// Minimal real API call to confirm the key is valid before it's ever stored.
async function testCredential(provider: LLMCredentialProvider, model: string, apiKey: string): Promise<void> {
  try {
    await callChatLLM({
      provider,
      model,
      systemPrompt: 'Reply with the single word: ok',
      userMessage: 'ping',
      maxTokens: 8,
      apiKey,
    });
  } catch (err) {
    throw new ValidationError(
      `Could not verify this ${provider} key: ${err instanceof Error ? err.message : 'request failed'}`
    );
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
