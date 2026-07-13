import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Minus } from 'lucide-react';
import { LogoMark } from '../../components/ui/Logo';

const ROWS: Array<[string, boolean | string, boolean | string]> = [
  ['Vector similarity search', true, true],
  ['Graph / multi-hop traversal', true, false],
  ['Automatic per-query routing between vector and graph', true, false],
  ['Document parsing & chunking built in', true, false],
  ['Database-enforced per-organization isolation', true, 'Namespace-based, application-enforced'],
  ['Bring your own LLM key for answer generation', true, 'N/A — retrieval only'],
  ['Managed infrastructure', true, true],
];

export function ComparePinecone() {
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
        <h1 className="font-headline text-[32px] font-semibold text-white mb-2">FUGU vs. Pinecone</h1>
        <p className="text-white/40 text-[13px] mb-10">A honest comparison for teams evaluating a managed vector database against a routed RAG platform.</p>

        <p className="mb-8">
          Pinecone is a managed vector database — it stores embeddings and answers similarity
          queries well. FUGU is built one layer up: it includes vector search, but also decides,
          per query, whether a graph traversal would answer it better, and handles document
          ingestion and answer generation around that retrieval layer.
        </p>

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-3 font-semibold text-white">Capability</th>
                <th className="p-3 font-semibold text-white">FUGU</th>
                <th className="p-3 font-semibold text-white">Pinecone</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, fugu, other]) => (
                <tr key={label} className="border-b border-white/5 last:border-0">
                  <td className="p-3">{label}</td>
                  <td className="p-3">
                    {typeof fugu === 'boolean' ? (
                      fugu ? <Check size={16} className="text-accent-teal-glow" /> : <Minus size={16} className="text-white/30" />
                    ) : fugu}
                  </td>
                  <td className="p-3">
                    {typeof other === 'boolean' ? (
                      other ? <Check size={16} className="text-accent-teal-glow" /> : <Minus size={16} className="text-white/30" />
                    ) : other}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-white/50 text-[13px]">
          Pinecone is a solid choice if you only need vector similarity search and plan to build
          routing, parsing, and tenant isolation yourself. FUGU is a better fit if you want that
          layer already built, tested, and enforced at the database level.
        </p>

        <div className="mt-10">
          <Link
            to="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-[15px] font-semibold text-white bg-brand-indigo hover:opacity-90 transition-all"
          >
            Try FUGU for free
          </Link>
        </div>
      </main>
    </div>
  );
}
