// Entity extraction hits a real LLM call which can be slow — far past this
// suite's per-assertion wait windows. Disabling it here keeps document-upload
// integration tests scoped to the parsing/embedding/chunking pipeline they're
// actually meant to verify.
process.env.ENTITY_EXTRACTION_ENABLED = 'false';

// env.ts requires this at module load time (BYOK credential encryption) —
// tests never touch real credentials, so any 32-byte value satisfies the
// schema without needing a real production key.
process.env.CREDENTIAL_ENCRYPTION_KEY ??= 'a'.repeat(32);
