/**
 * Fresh-project smoke test for @fugu/sdk (TypeScript SDK).
 *
 * What this does: creates a FuguClient with a real API key (read from the
 * FUGU_API_KEY env var — never hardcode or print a key), then exercises
 * every public resource against a real running FUGU backend:
 *   - credentials.get() / listModels()  — BYOK credential introspection
 *   - documents.list()                  — document listing
 *   - query.execute()                   — non-streaming RAG query
 *   - query.stream()                    — streaming RAG query (SSE)
 *
 * How to run:
 *   1. cd examples/ts-sdk-test
 *   2. npm install
 *   3. FUGU_API_KEY=fugu_sk_... FUGU_BASE_URL=http://localhost:3001/api npm start
 *
 * Requires a running FUGU backend with an organization that has a BYOK LLM
 * credential configured (see backend/src/services/credential.service.ts) for
 * query.execute/stream to return an actual answer instead of BYOK_REQUIRED.
 */
import { FuguClient, BYOKRequiredError, FuguApiError } from '@fugu/sdk';

async function main() {
  const apiKey = process.env.FUGU_API_KEY;
  if (!apiKey) {
    console.error('Set FUGU_API_KEY before running this example.');
    process.exit(1);
  }

  const client = new FuguClient({
    apiKey,
    baseUrl: process.env.FUGU_BASE_URL ?? 'http://localhost:3001/api',
  });

  console.log('--- credentials.get() ---');
  const credential = await client.credentials.get();
  console.log(credential);

  console.log('\n--- credentials.listModels("openrouter") ---');
  const models = await client.credentials.listModels('openrouter');
  console.log(`${models.length} models, ${models.filter((m) => m.free).length} free`);

  console.log('\n--- documents.list() ---');
  const docs = await client.documents.list({ limit: 5 });
  console.log(`${docs.length} document(s)`);

  console.log('\n--- query.execute() ---');
  try {
    const result = await client.query.execute('What is FUGU?', { strategy: 'vector_only', top_k: 3 });
    console.log('answer:', result.answer.slice(0, 200));
    console.log('citations:', result.citations);
    console.log('quota:', result.quota);
  } catch (err) {
    if (err instanceof BYOKRequiredError) {
      console.log('BYOK_REQUIRED (expected if no credential configured):', err.message);
    } else if (err instanceof FuguApiError) {
      console.log(`API error ${err.status} (${err.code}):`, err.message);
    } else {
      throw err;
    }
  }

  console.log('\n--- query.stream() ---');
  try {
    let answer = '';
    for await (const event of client.query.stream('What is FUGU?', { strategy: 'vector_only', top_k: 3 })) {
      if (event.type === 'delta') answer += event.text;
      if (event.type === 'done') console.log('stream done, citations:', event.citations);
      if (event.type === 'error') console.log('stream error event:', event.message);
    }
    console.log('streamed answer:', answer.slice(0, 200));
  } catch (err) {
    if (err instanceof BYOKRequiredError) {
      console.log('BYOK_REQUIRED (expected if no credential configured):', err.message);
    } else if (err instanceof FuguApiError) {
      console.log(`API error ${err.status} (${err.code}):`, err.message);
    } else {
      throw err;
    }
  }

  console.log('\nAll checks completed.');
}

main().catch((err) => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});
