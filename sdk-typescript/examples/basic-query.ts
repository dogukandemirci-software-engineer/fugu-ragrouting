import { FuguClient, BYOKRequiredError, QuotaExceededError } from '../src/index';

async function main() {
  const apiKey = process.env.FUGU_API_KEY;
  if (!apiKey) {
    throw new Error('Set FUGU_API_KEY env var to a valid fugu_sk_... key');
  }

  const client = new FuguClient({
    apiKey,
    baseUrl: process.env.FUGU_BASE_URL ?? 'http://localhost:3001/api',
  });

  // 1. Non-streaming query
  try {
    const result = await client.query.execute('what does FUGU combine to answer questions');
    console.log('Answer:', result.answer);
    console.log('Strategy used:', result.explain.strategy_final);
    console.log('Sources:', result.results.length);
  } catch (err) {
    if (err instanceof BYOKRequiredError) {
      console.error('No LLM credential configured for this org. Set one via client.credentials.save().');
      return;
    }
    if (err instanceof QuotaExceededError) {
      console.error('Monthly query quota exceeded.');
      return;
    }
    throw err;
  }

  // 2. Streaming query
  console.log('\nStreaming:');
  for await (const event of client.query.stream('what does FUGU combine to answer questions')) {
    if (event.type === 'delta') process.stdout.write(event.text);
    if (event.type === 'done') console.log('\n[done]', event.citations);
    if (event.type === 'error') console.error('\n[stream error]', event.message);
  }

  // 3. Documents
  const docs = await client.documents.list({ limit: 5 });
  console.log('\nDocuments:', docs.length);

  // 4. Credentials
  const credential = await client.credentials.get();
  console.log('Credential:', credential);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
