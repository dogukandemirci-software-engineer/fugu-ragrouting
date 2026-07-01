/**
 * FUGU Example App
 *
 * Demonstrates: auto routing, forced strategies, and explain output.
 * Run: npx ts-node app.ts
 */
import { FuguClient } from './fugu-sdk';

const API_KEY = 'fugu_sk_x0qDmgcQUjq2QlzpM--LpdGRCo0sPV0z';

const client = new FuguClient(API_KEY, 'http://localhost:3001');

function printResult(label: string, r: Awaited<ReturnType<typeof client.query>>) {
  const LINE = '─'.repeat(60);
  console.log(`\n${LINE}`);
  console.log(`[${label}]`);
  console.log(`  Strategy selected : ${r.explain.strategy_selected}`);
  console.log(`  Strategy final    : ${r.explain.strategy_final}`);
  console.log(`  Classifier        : ${r.explain.classifier} (confidence ${r.explain.confidence.toFixed(2)})`);
  console.log(`  Vector hits       : ${r.explain.vector_count}`);
  console.log(`  Graph hits        : ${r.explain.graph_count}`);
  console.log(`  Graph available   : ${r.explain.graph_available}`);
  console.log(`  Results returned  : ${r.results.length}`);
  console.log(`  Quota             : ${r.quota.used}/${r.quota.limit} (${r.quota.percent.toFixed(3)}%)`);

  if (r.results.length > 0) {
    console.log('\n  Top result:');
    const top = r.results[0];
    console.log(`    source  : ${top.source}`);
    console.log(`    score   : ${top.score != null ? top.score.toFixed(4) : 'n/a'}`);
    console.log(`    content : ${top.content.slice(0, 120)}${top.content.length > 120 ? '…' : ''}`);
  } else {
    console.log('\n  (No results — knowledge base is empty, upload documents to see matches)');
  }

  if (r.quota.warn) {
    console.log('\n  ⚠ Quota warning: usage approaching limit');
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  FUGU SDK Example App');
  console.log(`  API : http://localhost:3001`);
  console.log(`  Key : ${API_KEY.slice(0, 16)}...`);
  console.log('═'.repeat(60));

  // 1. Auto routing — FUGU picks the best strategy
  printResult(
    'AUTO (FUGU decides)',
    await client.query('What are the main features of this product?')
  );

  // 2. Force vector-only — pure semantic similarity
  printResult(
    'VECTOR_ONLY (forced)',
    await client.query('Explain the system architecture', { strategy: 'vector_only', top_k: 3 })
  );

  // 3. Force hybrid — combine vector + graph traversal
  printResult(
    'HYBRID (forced)',
    await client.query('How do components relate to each other?', { strategy: 'hybrid', top_k: 5 })
  );

  // 4. Graph only — relationship traversal
  printResult(
    'GRAPH_ONLY (forced)',
    await client.query('Find connections between entities in the graph', { strategy: 'graph_only' })
  );

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  Done. Upload documents via the dashboard to get real results.');
  console.log('═'.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
