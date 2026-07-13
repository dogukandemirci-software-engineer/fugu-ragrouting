import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';

const FAQS = [
  {
    q: 'What is FUGU?',
    a: 'FUGU is a retrieval-augmented generation (RAG) platform. It classifies each incoming query and automatically routes it to a vector search backend (pgvector), a graph traversal backend (Apache AGE), or both, then grounds the generated answer in the actual retrieved chunks.',
  },
  {
    q: 'How does automatic query routing work?',
    a: 'An embedding-centroid classifier looks at each query and decides whether it is better served by vector similarity search, multi-hop graph traversal, or a hybrid of both — without you having to pick a backend manually or maintain separate pipelines.',
  },
  {
    q: 'What does "bring your own key" (BYOK) mean?',
    a: 'Answer generation runs on your own LLM API key (OpenAI, Anthropic, Gemini, OpenRouter, or Grok). You pay your provider directly at their rates, with full visibility into usage. Retrieval, routing, and graph search stay fully managed by FUGU.',
  },
  {
    q: 'How is tenant data isolated?',
    a: 'Every query, document, and graph traversal is scoped to organization_id at the repository and database layer — including multi-hop graph paths, not just top-level filters. This is enforced with row-level security, not just application-code checks.',
  },
  {
    q: 'What document formats can I upload?',
    a: 'FUGU parses PDF, DOCX, CSV, XLSX, JSON, and plain text/Markdown files, chunking them automatically before embedding and indexing.',
  },
  {
    q: 'Is FUGU GDPR / KVKK compliant?',
    a: 'Yes. FUGU supports self-serve data export, documents cross-border transfer disclosures, and provides an evidenced erasure workflow aligned with both the EU GDPR and the Turkish Personal Data Protection Law (KVKK).',
  },
  {
    q: 'Do you offer a free tier?',
    a: 'Yes, the free tier includes a monthly query allowance so you can evaluate FUGU before upgrading to a paid plan.',
  },
  {
    q: 'How is FUGU different from a plain vector database?',
    a: 'A vector database only does similarity search. FUGU adds automatic routing between vector and graph retrieval, database-enforced multi-tenant isolation, document ingestion/parsing, and BYOK answer generation on top — see our comparison pages for specifics.',
  },
];

export function FaqPage() {
  return (
    <div className="min-h-screen panel-dark">
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-ink-dark/85">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark size={32} className="rounded-lg" />
            <span className="text-[17px] font-headline font-semibold text-white">FUGU</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-[14px] text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 text-white/70 text-[15px] leading-relaxed">
        <h1 className="font-headline text-[32px] font-semibold text-white mb-2">Frequently asked questions</h1>
        <p className="text-white/40 text-[13px] mb-10">Answers about routing, tenant isolation, BYOK, and pricing.</p>

        <div className="space-y-8">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <h2 className="text-[17px] font-semibold text-white mb-2">{q}</h2>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
