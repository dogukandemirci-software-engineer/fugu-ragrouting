# fugu-sdk

TypeScript SDK for the FUGU routed RAG API. Class-based, zero runtime
dependencies (uses the platform `fetch`), works in Node 18+ and browsers.

## Install

```bash
npm install fugu-sdk
```

## Quick start

```ts
import { FuguClient } from 'fugu-sdk';

const client = new FuguClient({ apiKey: 'fugu_sk_...' });

const result = await client.query.execute('what does FUGU combine to answer questions');
console.log(result.answer);
```

Pass `baseUrl` to point at a non-default deployment:

```ts
new FuguClient({ apiKey: '...', baseUrl: 'https://api.example.com/api' });
```

## Resources

The client exposes three resource groups:

- `client.query` — run queries (`execute`, `stream`)
- `client.documents` — manage documents (`list`, `get`, `upload`, `delete`, `retry`)
- `client.credentials` — manage the org's BYOK LLM credential (`get`, `listModels`, `save`, `remove`)

### Queries

```ts
const result = await client.query.execute('my question', {
  strategy: 'hybrid', // 'vector_only' | 'graph_only' | 'hybrid' | 'auto'
  top_k: 10,
});
```

Streaming (async generator of SSE events):

```ts
for await (const event of client.query.stream('my question')) {
  switch (event.type) {
    case 'meta':
      console.log('sources:', event.results);
      break;
    case 'delta':
      process.stdout.write(event.text);
      break;
    case 'done':
      console.log('\ncitations:', event.citations);
      break;
    case 'error':
      console.error('stream error:', event.message);
      break;
  }
}
```

### Documents

```ts
const { document_id } = await client.documents.upload({
  filename: 'report.pdf',
  data: fs.readFileSync('report.pdf'), // Buffer, Uint8Array, or Blob
});

const docs = await client.documents.list({ limit: 20, offset: 0 });
const doc = await client.documents.get(document_id);
await client.documents.retry(document_id);
await client.documents.delete(document_id);
```

### Credentials (BYOK)

```ts
const models = await client.credentials.listModels('openrouter');

await client.credentials.save({
  provider: 'openrouter',
  model: models.find((m) => m.free)?.id ?? models[0].id,
  apiKey: 'sk-or-...',
});

const credential = await client.credentials.get(); // { provider, model, keyLastFour, lastVerifiedAt } | null
await client.credentials.remove();
```

## Errors

All non-2xx responses throw `FuguApiError` (with `status` and `code`).
Two conditions get typed subclasses so you can branch without string-matching:

```ts
import { FuguApiError, BYOKRequiredError, QuotaExceededError } from 'fugu-sdk';

try {
  await client.query.execute('...');
} catch (err) {
  if (err instanceof BYOKRequiredError) {
    // org has no LLM credential configured (HTTP 409)
  } else if (err instanceof QuotaExceededError) {
    // monthly query quota exceeded (HTTP 429)
  } else if (err instanceof FuguApiError) {
    console.error(err.status, err.code, err.message);
  }
}
```

## Example

See [examples/basic-query.ts](examples/basic-query.ts). Run with:

```bash
npm install
npm run build
FUGU_API_KEY=fugu_sk_... node -r ts-node/register examples/basic-query.ts
# or, after building:
FUGU_API_KEY=fugu_sk_... node -e "require('./dist/index')" # see examples for a full script
```
