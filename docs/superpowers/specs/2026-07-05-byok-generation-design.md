# BYOK (Bring Your Own Key) Generation System — Design Spec

Date: 2026-07-05

## Context

FUGU currently runs all LLM calls (routing classifier, entity extraction, answer synthesis) through server-side API keys configured via environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_URL`), selected globally by `LLM_SYNTHESIS_PROVIDER` / `LLM_CLASSIFIER_PROVIDER` / `ENTITY_EXTRACTION_PROVIDER`. This means FUGU bears 100% of LLM generation cost across all tenants.

The product is pivoting to a BYOK model: **the user-visible answer-generation step (synthesis) will run entirely on the organization's own API key**, for one of four supported providers: Anthropic (Claude), OpenAI, Google Gemini, or OpenRouter. Internal system operations — query routing classification, knowledge-graph entity extraction, and embeddings — continue to run on FUGU's existing OpenRouter credentials, unchanged. Ollama support is removed entirely (it was a local-dev/low-cost fallback that has no place in a BYOK-only generation model).

## Scope boundary (explicit)

| Operation | Who pays / whose key |
|---|---|
| Answer synthesis (`answer-synthesis.service.ts`) | **Organization's own key** (BYOK, required) |
| Query routing classifier (`routing-engine.service.ts` `LLMClassifier`) | FUGU's OpenRouter key (unchanged) |
| Entity extraction (`entity-extraction.service.ts`) | FUGU's OpenRouter key (unchanged) |
| Embeddings (`embedding.service.ts`) | FUGU's OpenRouter/OpenAI/Cohere key (unchanged) |

## Decisions (from brainstorming Q&A)

1. **No key = blocked query.** If an organization has no verified, active LLM credential configured, synthesis requests return an explicit error (`BYOK_REQUIRED`, HTTP 409) rather than silently falling back to a shared/default key. No hybrid fallback.
2. **Storage: AES-256-GCM, encrypted at rest in Postgres.** No external secret manager (Vault/KMS) — out of scope for this project's current infra. A single master encryption key lives in a new env var (`CREDENTIAL_ENCRYPTION_KEY`).
3. **Scope of BYOK: generation/synthesis only.** Classifier, entity extraction, embeddings stay on FUGU's OpenRouter infrastructure.
4. **Model selection: provider + fixed dropdown list**, not free-text. Each provider ships a hardcoded list of supported models in code; adding a new model requires a code change (accepted tradeoff for UX clarity and avoiding user typos in model IDs).
5. **Key validation: test call on save.** When a user adds/updates a credential, the backend immediately makes a minimal real API call to the provider. Save is rejected if the call fails (auth error, invalid key, network error surfaced as a clear message).
6. **One active provider per organization.** `organization_llm_credentials` has a unique constraint on `organization_id` — adding a new credential replaces the existing one (no multi-key-per-org, no per-query provider switching).
7. **UI location: existing Settings/Team page**, as a new section/card — no new standalone page.
8. **Old global synthesis env vars are fully removed from the code path** (not just left unused) — see Environment Variables section below.

## Environment Variables

**New:**
- `CREDENTIAL_ENCRYPTION_KEY` — 32-byte AES-256-GCM master key (hex or base64 encoded), used only to encrypt/decrypt rows in `organization_llm_credentials`. Losing this key makes all stored user credentials unrecoverable — must be backed up to a secure secret store before production deploy.

**Removed (deleted from `env.ts` schema and `.env.example`):**
- `LLM_SYNTHESIS_PROVIDER`, `LLM_SYNTHESIS_MODEL` — synthesis provider/model now comes from the org's stored credential, not a global default.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` as synthesis-path credentials — no longer read anywhere in the synthesis code path. (Embedding's `EMBEDDING_PROVIDER=openai` option, if used, is unaffected — that's a separate, unchanged code path in `embedding.service.ts`.)
- `OLLAMA_URL` — Ollama support removed entirely from `llm-client.ts`.
- The `ollama` enum member is removed from `LLM_CLASSIFIER_PROVIDER`, `ENTITY_EXTRACTION_PROVIDER`, and `EMBEDDING_PROVIDER` enums (routing/extraction/embedding already default to `openrouter` and never relied on Ollama in practice).

**Unchanged (FUGU's own OpenRouter-backed internal operations):**
- `OPENROUTER_API_KEY`, `OPENROUTER_EMBEDDING_MODEL`
- `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `EMBEDDING_CACHE_SIZE`, `EMBEDDING_CACHE_TTL_MS`
- `COHERE_API_KEY`
- `LLM_CLASSIFIER_PROVIDER`, `LLM_CLASSIFIER_MODEL`
- `ENTITY_EXTRACTION_ENABLED`, `ENTITY_EXTRACTION_PROVIDER`, `ENTITY_EXTRACTION_MODEL`, `ENTITY_EXTRACTION_MAX_TOKENS`
- `LLM_SYNTHESIS_TIMEOUT_MS` — kept as a provider-agnostic timeout applied to the user's own synthesis call.

**Never in env, by design:**
- User-supplied Anthropic/OpenAI/Gemini/OpenRouter API keys. These live only as encrypted rows in `organization_llm_credentials`, never written to `.env` or any config file.

## Database

New migration adding `organization_llm_credentials`:

```sql
CREATE TABLE organization_llm_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'gemini', 'openrouter')),
  model TEXT NOT NULL,
  encrypted_api_key BYTEA NOT NULL,
  key_iv BYTEA NOT NULL,
  key_auth_tag BYTEA NOT NULL,
  key_last_four TEXT NOT NULL, -- for display only, e.g. "...ab12"
  last_verified_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS follows the existing `organization_id` pattern used by every other tenant table in this codebase (`current_org_id()` policy, `FORCE ROW LEVEL SECURITY`).

## Backend Changes

### `backend/src/utils/llm-client.ts`
- Remove `callOllama`, `streamOllama`, and the `ollama` case from `LLMProvider` union, `callChatLLM`, `streamChatLLM`.
- Add `callGemini` / `streamGemini` using the Google Generative AI REST API (`generativelanguage.googleapis.com`), matching the existing plain-fetch pattern (no new SDK dependency).
- `LLMCallParams` gains a required `apiKey: string` field for provider calls that used to read `env.*_API_KEY` directly — all four synthesis-path providers now take the key as a parameter instead of reading `env`.

### New: `backend/src/repositories/credential.repository.ts`
Thin repository over `organization_llm_credentials`, following existing `BaseRepository` conventions (RLS-scoped via request context, same as every other repository in this codebase).

### New: `backend/src/services/credential.service.ts`
- `encrypt(plaintext, masterKey)` / `decrypt(...)` using Node's built-in `crypto` (AES-256-GCM, random IV per encryption).
- `save(orgId, provider, model, apiKey)`: runs the test call (via `llm-client.ts`, minimal token budget) before writing; throws a clear error on failure; on success, encrypts and upserts (replacing any existing credential for that org, per the one-active-provider decision).
- `getDecrypted(orgId)`: returns `{ provider, model, apiKey } | null` for use by `answer-synthesis.service.ts`.
- `getDisplay(orgId)`: returns `{ provider, model, keyLastFour, lastVerifiedAt } | null` for the settings UI — never returns the decrypted key.
- `remove(orgId)`.

### `backend/src/services/answer-synthesis.service.ts`
- Replace `env.LLM_SYNTHESIS_PROVIDER` / `env.LLM_SYNTHESIS_MODEL` reads with `CredentialService.getDecrypted(orgId)`.
- If no credential exists, throw a typed `BYOKRequiredError` — caught by the query controller/route and surfaced as `409 { error: { code: 'BYOK_REQUIRED', message: '...' } }`.
- `DEFAULT_MODELS` map removed (model now always comes from the stored credential's fixed dropdown selection, never defaulted).
- Streaming variant (`synthesizeStream`) gets the same treatment.

### `routing-engine.service.ts`, `entity-extraction.service.ts`
No functional change — continue reading `env.LLM_CLASSIFIER_PROVIDER` / `env.ENTITY_EXTRACTION_PROVIDER`, both OpenRouter-backed. Only the `ollama` enum member and its `DEFAULT_MODELS`/`CLASSIFIER_DEFAULT_MODELS` entries are deleted.

### New routes/controller
- `GET /api/organization/llm-credential` → `getDisplay`
- `PUT /api/organization/llm-credential` → validates provider/model against the fixed list, calls `save` (includes test call), returns display shape or 400 on validation failure
- `DELETE /api/organization/llm-credential` → `remove`

Role-gated: only org admins can modify (reuse existing `requireRole` middleware pattern already present in the codebase per the prior security-hardening plan).

## Frontend Changes

- New section in the existing Settings/Team page: provider select → model dropdown (populated from a shared constants file mirrored from backend's fixed model list) → API key input (write-only, never pre-filled) → "Test & Save" button → status display (provider, model, masked key, last verified timestamp, "Remove" action).
- Query submission UI: surface `BYOK_REQUIRED` errors with a direct link/CTA to the settings section instead of a generic "failed fetching" message.
- Landing page: add a "Works with your own API key" section listing the four supported providers (Anthropic, OpenAI, Google Gemini, OpenRouter) with their logos/names — marketing content only, reads from a static list, no fabricated data.

## System Prompt Revisions (bundled per user request)

All three prompts get revised for (a) token efficiency and (b) quality, without changing their fundamental contracts (citation format for synthesis, JSON shape for classifier/extraction):

1. **Synthesis prompt** (`answer-synthesis.service.ts`): tighten wording, remove redundant restatements, keep all grounding/citation/formatting rules intact — since this now runs on the user's own paid key, both cost-per-call and answer quality matter more directly to the user.
2. **Classifier prompt** (`routing-engine.service.ts`): add 2-3 concrete few-shot examples per strategy directly in the prompt to reduce misclassification, while trimming redundant rule restatement to control token growth from the added examples.
3. **Entity extraction prompt** (`entity-extraction.service.ts`): make the required `{name, type}` shape more forcefully explicit with an additional contrastive example (right shape vs. common wrong shape), directly targeting the failure modes the existing `normalizeEntity` fallback code was written to paper over.

No changes to the normalization/parsing safety nets already in place (`extractTripleObjects`, `normalizeEntity`, classifier enum validation) — prompt improvements reduce how often those fallbacks trigger, they don't replace them.

## Testing / Verification

- `tsc --noEmit` on backend after each phase.
- Unit tests for `credential.service.ts` encryption round-trip (encrypt→decrypt yields original plaintext; tampered ciphertext/IV/tag fails to decrypt).
- Integration test: save credential with a deliberately invalid key → rejected before write; save with valid key → row created, `getDisplay` never exposes plaintext.
- Manual curl verification: query with no credential configured → `409 BYOK_REQUIRED`; query with valid credential → real answer generated using the org's own key (verify via provider's own usage dashboard or a distinguishing model choice).
- Existing Jest suite must remain green; routing/entity-extraction tests unaffected since those paths are unchanged.

## Out of Scope
- Multi-key-per-org / per-query provider switching.
- External secret manager (Vault/KMS).
- Free-text model IDs.
- Any change to routing classifier or entity extraction provider (both stay on OpenRouter).
- 2FA, Stripe changes, SSO (per standing prior direction).
