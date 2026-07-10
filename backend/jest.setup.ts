// Entity extraction hits a real LLM call which can be slow — far past this
// suite's per-assertion wait windows. Disabling it here keeps document-upload
// integration tests scoped to the parsing/embedding/chunking pipeline they're
// actually meant to verify.
process.env.ENTITY_EXTRACTION_ENABLED = 'false';

// env.ts requires this at module load time (BYOK credential encryption) and
// now validates it decodes to exactly 32 bytes (AES-256). Use a real 64-hex
// (32-byte) key so credential save/encryption paths are actually exercisable
// in tests — the previous 'a'.repeat(32) placeholder is 32 CHARS but decodes
// to 24 bytes as base64, so any test hitting encryption threw at runtime.
process.env.CREDENTIAL_ENCRYPTION_KEY ??= '0'.repeat(64);
