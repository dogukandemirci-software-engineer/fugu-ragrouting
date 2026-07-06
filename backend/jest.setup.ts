// Entity extraction hits a real local LLM (Ollama) which can cold-start in
// 30-50s — far past this suite's per-assertion wait windows. Disabling it
// here keeps document-upload integration tests scoped to the parsing/
// embedding/chunking pipeline they're actually meant to verify.
process.env.ENTITY_EXTRACTION_ENABLED = 'false';
