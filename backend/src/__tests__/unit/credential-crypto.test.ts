import * as crypto from 'crypto';
import { parseMasterKey, encryptCredential, decryptCredential } from '../../utils/credential-crypto.util';

describe('credential-crypto', () => {
  const masterKey = crypto.randomBytes(32);

  it('round-trips: encrypt then decrypt yields the original plaintext', () => {
    const plaintext = 'sk-ant-super-secret-key-12345';
    const { ciphertext, iv, authTag } = encryptCredential(plaintext, masterKey);
    const decrypted = decryptCredential(ciphertext, iv, authTag, masterKey);
    expect(decrypted).toBe(plaintext);
  });

  it('produces a different IV (and ciphertext) on every call', () => {
    const a = encryptCredential('same-plaintext', masterKey);
    const b = encryptCredential('same-plaintext', masterKey);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it('fails to decrypt with a tampered ciphertext', () => {
    const { ciphertext, iv, authTag } = encryptCredential('secret', masterKey);
    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 0xff;
    expect(() => decryptCredential(tampered, iv, authTag, masterKey)).toThrow();
  });

  it('fails to decrypt with a tampered IV', () => {
    const { ciphertext, iv, authTag } = encryptCredential('secret', masterKey);
    const tamperedIv = Buffer.from(iv);
    tamperedIv[0] ^= 0xff;
    expect(() => decryptCredential(ciphertext, tamperedIv, authTag, masterKey)).toThrow();
  });

  it('fails to decrypt with a tampered auth tag', () => {
    const { ciphertext, iv, authTag } = encryptCredential('secret', masterKey);
    const tamperedTag = Buffer.from(authTag);
    tamperedTag[0] ^= 0xff;
    expect(() => decryptCredential(ciphertext, iv, tamperedTag, masterKey)).toThrow();
  });

  it('fails to decrypt with the wrong master key', () => {
    const { ciphertext, iv, authTag } = encryptCredential('secret', masterKey);
    const wrongKey = crypto.randomBytes(32);
    expect(() => decryptCredential(ciphertext, iv, authTag, wrongKey)).toThrow();
  });

  describe('parseMasterKey', () => {
    it('accepts a 64-char hex string', () => {
      const hex = crypto.randomBytes(32).toString('hex');
      expect(parseMasterKey(hex)).toHaveLength(32);
    });

    it('accepts a base64 string that decodes to 32 bytes', () => {
      const b64 = crypto.randomBytes(32).toString('base64');
      expect(parseMasterKey(b64)).toHaveLength(32);
    });

    it('throws if the decoded key is not 32 bytes', () => {
      const shortB64 = crypto.randomBytes(16).toString('base64');
      expect(() => parseMasterKey(shortB64)).toThrow(/32 bytes/);
    });
  });
});
