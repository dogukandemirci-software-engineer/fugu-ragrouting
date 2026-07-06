# @fugu/sdk

Minimal TypeScript client for the FUGU routed RAG API.

## Usage

```ts
import { FuguClient } from '@fugu/sdk';

const client = new FuguClient({ apiKey: 'fugu_sk_...' });

const result = await client.query('what does FUGU combine to answer questions');
console.log(result.answer);
```

Pass `baseUrl` to point at a non-default deployment:

```ts
new FuguClient({ apiKey: '...', baseUrl: 'https://api.example.com/api' });
```

## Example

See [examples/basic-query.ts](examples/basic-query.ts). Run with:

```bash
npm install
npm run build
FUGU_API_KEY=fugu_sk_... node examples/basic-query.js
```
