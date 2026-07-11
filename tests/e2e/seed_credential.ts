// Test-only helper: inserts an organization_llm_credentials row directly,
// bypassing CredentialService.save()'s testCredential() call (which hits the
// real provider — exactly what the E2E mock test is avoiding). Uses the
// app's own encryption/repository code, not a reimplementation, so the row
// is byte-for-byte what a real save() would have produced.
//
// Usage: ts-node seed_credential.ts <orgId> <provider> <model> <fakeApiKey>
import { env } from '../../backend/src/config/env';
import { parseMasterKey, encryptCredential } from '../../backend/src/utils/credential-crypto.util';
import { CredentialRepository } from '../../backend/src/repositories/credential.repository';
import { runInOrgScope } from '../../backend/src/config/request-context';

async function main() {
  const [orgId, provider, model, apiKey] = process.argv.slice(2);
  if (!orgId || !provider || !model || !apiKey) {
    console.error('Usage: seed_credential.ts <orgId> <provider> <model> <fakeApiKey>');
    process.exit(1);
  }

  await runInOrgScope(orgId, async () => {
    const repo = new CredentialRepository();
    const { ciphertext, iv, authTag } = encryptCredential(apiKey, parseMasterKey(env.CREDENTIAL_ENCRYPTION_KEY));
    await repo.upsert({
      organization_id: orgId,
      provider: provider as any,
      model,
      encrypted_api_key: ciphertext,
      key_iv: iv,
      key_auth_tag: authTag,
      key_last_four: apiKey.slice(-4),
      last_verified_at: new Date(),
    });
  });

  console.log('seeded');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
