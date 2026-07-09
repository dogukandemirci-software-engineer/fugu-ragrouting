import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';
import { CodeBlock } from '../components/ui/CodeBlock';

const TS_INSTALL = `npm install fugu-sdk`;

const TS_QUERY = `import { FuguClient } from 'fugu-sdk';

const client = new FuguClient({ apiKey: 'fugu_sk_...' });

const result = await client.query.execute('what does FUGU combine to answer questions', {
  strategy: 'auto', // 'vector_only' | 'graph_only' | 'hybrid' | 'auto'
  top_k: 10,
});

console.log(result.answer);
console.log(result.citations);   // e.g. ["S1", "S3"]
console.log(result.results);     // supporting source chunks
console.log(result.quota);       // { used, limit, percent, warn }`;

const TS_UPLOAD = `import { readFile } from 'fs/promises';

const file = await readFile('./handbook.pdf');

const doc = await client.documents.upload({
  filename: 'handbook.pdf',
  data: file,
  contentType: 'application/pdf',
});

console.log(doc.id, doc.status); // "pending" — ingestion runs async`;

const TS_CUSTOM_URL = `const client = new FuguClient({
  apiKey: 'fugu_sk_...',
  baseUrl: 'https://your-fugu-deployment.example.com/api',
});`;

const PY_INSTALL = `pip install fugu-sdk`;

const PY_QUERY = `from fugu_sdk import FuguClient

client = FuguClient(api_key="fugu_sk_...")

result = client.query(
    "what does FUGU combine to answer questions",
    strategy="auto",  # "vector_only" | "graph_only" | "hybrid" | "auto"
    top_k=10,
)

print(result.answer)
print(result.citations)   # e.g. ["S1", "S3"]
print(result.results)     # supporting source chunks
print(result.quota)       # {"used": ..., "limit": ..., "percent": ..., "warn": ...}`;

const PY_CUSTOM_URL = `client = FuguClient(
    api_key="fugu_sk_...",
    base_url="https://your-fugu-deployment.example.com/api",
)`;

// Grounded in the real backend contract: query.routes mounts POST /v1/query
// under /queries, and api-key.middleware requires `Authorization: Bearer fugu_sk_...`.
const REST_QUERY = `curl -X POST https://your-fugu-deployment.example.com/api/queries/v1/query \\
  -H "Authorization: Bearer fugu_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "what does FUGU combine to answer questions",
    "strategy": "auto",
    "top_k": 10
  }'`;

const NAV_CLASS = 'text-[13px] font-medium text-white/50 hover:text-white transition-colors';

export function DocsPage() {
  return (
    <div className="min-h-screen panel-dark">
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-ink-dark/85">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={32} className="rounded-lg" />
            <span className="text-[17px] font-headline font-semibold text-white">FUGU</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-[14px] text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-headline text-[36px] font-semibold mb-3">Documentation</h1>
        <p className="text-white/50 text-[16px] mb-12 max-w-xl">
          Official SDKs for integrating FUGU's routed retrieval into your application.
        </p>

        {/* API key setup */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-3">1. Get an API key</h2>
          <p className="text-white/60 text-[14px] leading-relaxed mb-4">
            API keys authenticate SDK requests to your organization. Create one from{' '}
            <Link to="/dashboard/api-keys" className={NAV_CLASS + ' underline'}>
              Dashboard → API Keys
            </Link>
            . Keys are shown once at creation — store them securely.
          </p>
        </section>

        {/* TypeScript SDK */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-1">2. TypeScript SDK</h2>
          <p className="text-white/40 text-[13px] mb-4 font-mono">@fugu/sdk</p>
          <div className="space-y-4">
            <CodeBlock code={TS_INSTALL} language="bash" />
            <CodeBlock code={TS_QUERY} language="typescript" />
            <p className="text-white/50 text-[13px] leading-relaxed">
              Upload a document for ingestion:
            </p>
            <CodeBlock code={TS_UPLOAD} language="typescript" />
            <p className="text-white/50 text-[13px] leading-relaxed">
              Point at a self-hosted or non-default deployment with <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">baseUrl</code>:
            </p>
            <CodeBlock code={TS_CUSTOM_URL} language="typescript" />
          </div>
        </section>

        {/* Python SDK */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-1">3. Python SDK</h2>
          <p className="text-white/40 text-[13px] mb-4 font-mono">fugu-sdk</p>
          <div className="space-y-4">
            <CodeBlock code={PY_INSTALL} language="bash" />
            <CodeBlock code={PY_QUERY} language="python" />
            <p className="text-white/50 text-[13px] leading-relaxed">
              Point at a self-hosted or non-default deployment with <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">base_url</code>:
            </p>
            <CodeBlock code={PY_CUSTOM_URL} language="python" />
          </div>
        </section>

        {/* Raw REST */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-1">4. Raw REST</h2>
          <p className="text-white/50 text-[13px] mb-4">
            No SDK required — every endpoint is a plain JSON HTTP call authenticated with your API key.
          </p>
          <CodeBlock code={REST_QUERY} language="bash" />
        </section>

        {/* Streaming */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-3">Streaming answers</h2>
          <p className="text-white/60 text-[14px] leading-relaxed">
            The in-app <Link to="/dashboard/queries" className={NAV_CLASS + ' underline'}>Query Explorer</Link> streams
            answers token-by-token over Server-Sent Events, so results render as they are generated instead of after a
            full round-trip. Each SSE frame is a JSON <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">data:</code> event
            of type <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">meta</code> (retrieved
            sources + routing metadata), <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">delta</code> (an
            answer text chunk), then a terminal <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">done</code> event
            with the final citations. The SDK <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">query()</code> method
            returns the fully assembled response shape below.
          </p>
        </section>

        {/* Response shape */}
        <section className="mb-16">
          <h2 className="text-[22px] font-bold mb-3">Response shape</h2>
          <p className="text-white/60 text-[14px] leading-relaxed mb-4">
            Both SDKs return the same fields: <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">answer</code> (a
            grounded, markdown-formatted answer), <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">citations</code> (source
            markers referenced in the answer), <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">results</code> (the
            supporting source chunks), <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">explain</code> (routing
            metadata — strategy used, classifier, confidence), and <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[12px]">quota</code> (your
            organization's current usage against its monthly limit).
          </p>
        </section>
      </div>
    </div>
  );
}
