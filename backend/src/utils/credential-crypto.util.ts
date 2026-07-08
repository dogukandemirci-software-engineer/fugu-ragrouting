import * as crypto from 'crypto';

// AES-256-GCM encrypt/decrypt for organization_llm_credentials rows. Split out
// from credential.service.ts so the round-trip can be unit-tested without a
// database or CREDENTIAL_ENCRYPTION_KEY env dependency.

export function parseMasterKey(raw: string): Buffer {
  // Accepts hex or base64 — validated to be exactly 32 bytes for AES-256-GCM.
  const key = /^[0-9a-fA-F]+$/.test(raw) && raw.length === 64
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)');
  }
  return key;
}

export function encryptCredential(plaintext: string, masterKey: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decryptCredential(ciphertext: Buffer, iv: Buffer, authTag: Buffer, masterKey: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
