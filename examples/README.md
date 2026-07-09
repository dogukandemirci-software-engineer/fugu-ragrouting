# SDK smoke-test examples

Two throwaway, fresh consumer projects used to verify `sdk-typescript` and
`sdk-go` actually work end-to-end against a real running FUGU backend — not
just that they compile. Each imports its SDK the way a real external
consumer would (npm `file:` dependency / Go module `replace` directive),
then exercises every public method with a real API key and a real BYOK
credential.

## `ts-sdk-test/`

Node/TypeScript project depending on `@fugu/sdk` via `"file:../../sdk-typescript"`.
Exercises: `credentials.get/listModels`, `documents.list`, `query.execute`,
`query.stream`.

```bash
cd examples/ts-sdk-test
npm install
FUGU_API_KEY=fugu_sk_... FUGU_BASE_URL=http://localhost:3001/api npm start
```

## `go-sdk-test/`

Go module depending on `sdk-go` via a `replace` directive pointing at
`../../sdk-go`. Exercises the same operations: `Credentials.Get/ListModels`,
`Documents.List`, `Query.Execute`, `Query.Stream`.

```bash
cd examples/go-sdk-test
go mod tidy
FUGU_API_KEY=fugu_sk_... FUGU_BASE_URL=http://localhost:3001/api go run main.go
```

## Prerequisites for either

- A running FUGU backend (`cd backend && npm run build && node dist/src/server.js`,
  with Postgres/Redis/Redpanda up via `docker compose up -d`).
- A real API key: sign up, log in, then `POST /api/api-keys` with
  `{"name": "...", "permissions": ["read","write"]}` — `write` is required
  for the credential-save calls these examples make.
- A BYOK credential configured for the org (`PUT /api/organization/llm-credential`)
  so `query.execute`/`query.stream` return a real answer instead of a
  `BYOK_REQUIRED` error.

Both scripts handle `BYOK_REQUIRED` and `QUOTA_EXCEEDED` as expected,
typed errors rather than crashing — if you run them without a credential
configured you'll see that error reported cleanly instead of an answer.
