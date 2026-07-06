import { Link } from 'react-router-dom';
import { Search, GitBranch, Layers, ArrowRight, Check, BookOpen, Terminal, ShieldCheck, Lock, Building2, FileCheck2 } from 'lucide-react';
import { useListPlansQuery } from '../store/api/billingApi';
import { LogoMark } from '../components/ui/Logo';
import { RevealSection } from '../components/ui/RevealSection';

const FEATURE_CARDS = [
  {
    icon: Search,
    accent: 'text-accent-violet bg-accent-violet/10 border-accent-violet/30',
    title: 'Vector Search',
    desc: 'Semantic similarity search over embedded document chunks. Best for conceptual or open-ended questions.',
  },
  {
    icon: GitBranch,
    accent: 'text-accent-magenta bg-accent-magenta/10 border-accent-magenta/30',
    title: 'Graph Routing',
    desc: 'Apache AGE-powered graph queries for relationship and entity lookups. Ideal for structured knowledge.',
  },
  {
    icon: Layers,
    accent: 'text-secondary bg-secondary/10 border-secondary/30',
    title: 'Hybrid Mode',
    desc: 'Fusion of both strategies, ranked by relevance. FUGU picks this automatically for complex queries.',
  },
];

const SECURITY_CARDS = [
  {
    icon: ShieldCheck,
    accent: 'text-accent-teal-glow bg-accent-teal-glow/10 border-accent-teal-glow/30',
    title: 'Strict tenant isolation',
    desc: 'Every query, document, and graph traversal is scoped to organization_id at the repository layer — including multi-hop graph paths, not just entry points.',
  },
  {
    icon: Lock,
    accent: 'text-accent-magenta bg-accent-magenta/10 border-accent-magenta/30',
    title: 'SSRF-hardened webhooks',
    desc: 'Outbound webhook URLs are resolved and validated against private/reserved IP ranges before every dispatch, defending against DNS rebinding attacks.',
  },
  {
    icon: FileCheck2,
    accent: 'text-secondary bg-secondary/10 border-secondary/30',
    title: 'Complete audit trail',
    desc: 'Every mutating action — including failed logins, password resets, and role changes — is written to an immutable, org-scoped audit log.',
  },
  {
    icon: Building2,
    accent: 'text-accent-violet bg-accent-violet/10 border-accent-violet/30',
    title: 'GDPR / KVKK data controls',
    desc: 'Self-serve data export, documented cross-border transfer disclosures, and a 30-day evidenced erasure workflow for full regulatory alignment.',
  },
];

const INCLUDED_FEATURES = [
  'Multi-format document parsing (PDF, DOCX, CSV, XLSX, JSON)',
  'OpenRouter, OpenAI, Cohere, Ollama embedding support',
  'LLM-based query classifier (Claude via OpenRouter)',
  'Apache AGE graph routing',
  'Google OAuth + JWT auth',
  'API key management',
  'Usage quotas & billing',
  'Webhook integrations',
  'Audit logs',
  'Team management',
];

export function LandingPage() {
  const { data: plansData } = useListPlansQuery();
  const PLANS = (plansData?.plans ?? []).map((p) => ({
    name: p.label,
    limit: p.tier === 'free' ? 'Included query allowance' : `${p.queries} queries / month`,
    features: p.features,
    highlighted: p.highlighted,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-outline-variant backdrop-blur-xl bg-background/85">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} className="rounded-lg" />
            <span className="text-[17px] font-headline font-semibold text-on-surface">FUGU</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/log-in"
              className="text-[14px] font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="px-4 py-2 rounded-lg text-[14px] font-semibold text-white bg-brand-indigo transition-all hover:opacity-90"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex items-center overflow-hidden min-h-[75vh]">
        {/* Warm ambient glow instead of a stock neon render */}
        <div className="absolute top-1/4 right-1/4 w-[560px] h-[560px] rounded-full blur-[160px] pointer-events-none bg-accent-violet/[0.12] animate-float" />
        <div className="absolute bottom-1/4 left-1/3 w-[420px] h-[420px] rounded-full blur-[140px] pointer-events-none bg-accent-teal-glow/[0.14] animate-float" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-full text-[13px] font-medium mb-8 text-on-surface-variant animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-accent-violet shadow-accent-glow" />
            Enterprise-grade RAG infrastructure — multi-tenant by design
          </div>

          <h1 className="font-headline text-[48px] md:text-[64px] font-semibold leading-[1.1] tracking-tight mb-6 text-on-surface animate-fade-in-up">
            Retrieval infrastructure{' '}
            <span className="brand-gradient-text">
              your security team approves
            </span>
          </h1>

          <p className="text-[18px] text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up">
            FUGU routes every query between vector search and graph databases automatically,
            with strict tenant isolation, full audit trails, and GDPR/KVKK-ready data controls
            baked into the platform — not bolted on.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up">
            <Link
              to="/sign-up"
              className="btn-brand px-8 py-3.5 text-[16px] font-bold hover:scale-[1.02]"
            >
              Start for free <ArrowRight size={18} />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[10px] text-[16px] font-semibold text-on-surface border border-outline-variant hover:bg-surface-container-lowest transition-all"
            >
              Talk to engineering <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-10 border-t border-outline-variant">
            {[
              { value: '< 200ms', label: 'Avg query latency' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: 'Org-scoped', label: 'Tenant isolation' },
              { value: 'GDPR / KVKK', label: 'Compliance ready' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="font-headline text-[28px] font-semibold text-on-surface">{value}</div>
                <div className="text-[12px] text-outline uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-10 px-6 border-t border-b border-outline-variant bg-surface-container-lowest/50">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-on-surface-variant">
          {[
            { icon: ShieldCheck, label: 'Row-level tenant isolation' },
            { icon: Lock, label: 'SSRF-hardened webhooks' },
            { icon: FileCheck2, label: 'Full audit logging' },
            { icon: Building2, label: 'GDPR / KVKK compliant' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-[13px] font-medium">
              <Icon size={16} />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <RevealSection className="py-24 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="font-headline text-[36px] font-semibold mb-4 text-on-surface">How FUGU works</h2>
          <p className="text-on-surface-variant text-[16px] max-w-xl mx-auto">
            Three routing strategies, one intelligent classifier.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map(({ icon: Icon, accent, title, desc }) => (
            <div
              key={title}
              className="rounded-[12px] border border-outline-variant p-6 bg-surface-container-lowest hover:border-accent-violet/40 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 border ${accent}`}>
                <Icon size={20} />
              </div>
              <h3 className="text-[18px] font-semibold text-on-surface mb-2">{title}</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* Security & Compliance */}
      <RevealSection className="py-24 px-6 border-t border-outline-variant">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-[36px] font-semibold mb-4 text-on-surface">Built for security teams, not just developers</h2>
            <p className="text-on-surface-variant text-[16px] max-w-xl mx-auto">
              Every tenant boundary is enforced at the database layer — not assumed at the application layer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {SECURITY_CARDS.map(({ icon: Icon, accent, title, desc }) => (
              <div
                key={title}
                className="rounded-[12px] border border-outline-variant p-6 flex gap-4 bg-surface-container-lowest hover:border-accent-violet/40 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${accent}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-on-surface mb-1.5">{title}</h3>
                  <p className="text-[14px] text-on-surface-variant leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* What's included */}
      <RevealSection className="py-20 px-6 border-t border-outline-variant bg-surface-container-lowest/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-headline text-[32px] font-semibold mb-4 text-on-surface">Everything you need</h2>
          <p className="text-on-surface-variant text-[15px] mb-12">
            Ship production-grade RAG infrastructure on day one.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
            {INCLUDED_FEATURES.map((feat) => (
              <div key={feat} className="flex items-start gap-3 py-2">
                <Check size={16} className="text-accent-violet shrink-0 mt-0.5" />
                <span className="text-[14px] text-on-surface">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* Pricing */}
      <RevealSection className="py-24 px-6 border-t border-outline-variant">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-[36px] font-semibold mb-4 text-on-surface">Plans that scale with you</h2>
            <p className="text-on-surface-variant text-[16px]">Start free, upgrade as your query volume grows.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[12px] p-6 border transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'border-accent-violet/50 bg-accent-violet/5'
                    : 'border-outline-variant bg-surface-container-lowest'
                }`}
              >
                <h3 className="text-[20px] font-semibold text-on-surface mb-1">{plan.name}</h3>
                <p className="text-[14px] text-on-surface-variant mb-5">{plan.limit}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-on-surface">
                      <Check size={14} className="text-accent-violet shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/sign-up"
                  className={
                    plan.highlighted
                      ? 'btn-brand w-full justify-center py-2.5 text-[14px]'
                      : 'block text-center py-2.5 rounded-lg text-[14px] font-semibold text-on-surface border border-outline-variant hover:bg-surface-container transition-all'
                  }
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-outline text-[12px] mt-8">
            Contact us for custom Enterprise pricing and volume discounts.
          </p>
        </div>
      </RevealSection>

      {/* Docs / SDK callout */}
      <RevealSection className="py-20 px-6 border-t border-outline-variant bg-surface-container-lowest/50">
        <div className="max-w-4xl mx-auto rounded-[12px] border border-outline-variant p-10 text-center bg-surface-container-lowest">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 bg-accent-violet/10 border border-accent-violet/30">
            <Terminal size={22} className="text-accent-violet" />
          </div>
          <h2 className="font-headline text-[26px] font-semibold mb-3 text-on-surface">Build with the FUGU SDKs</h2>
          <p className="text-on-surface-variant text-[15px] mb-8 max-w-lg mx-auto">
            Official TypeScript and Python SDKs make it simple to integrate routed retrieval into your application.
          </p>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-[15px] font-semibold text-on-surface border border-outline-variant hover:bg-background transition-all"
          >
            <BookOpen size={16} /> View documentation
          </Link>
        </div>
      </RevealSection>

      {/* CTA */}
      <RevealSection className="py-24 px-6 text-center border-t border-outline-variant">
        <h2 className="font-headline text-[36px] font-semibold mb-4 text-on-surface">Ready to get started?</h2>
        <p className="text-on-surface-variant text-[16px] mb-8">Free tier includes a generous monthly query allowance.</p>
        <Link
          to="/sign-up"
          className="btn-brand px-10 py-4 text-[16px] font-bold hover:scale-[1.02]"
        >
          Create free account <ArrowRight size={18} />
        </Link>
      </RevealSection>

      {/* Footer */}
      <footer className="border-t border-outline-variant py-8 px-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
        <p className="text-[13px] text-outline">
          © 2026 FUGU RAG Routing
        </p>
        <span className="hidden sm:inline text-outline-variant">·</span>
        <Link to="/docs" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">Documentation</Link>
        <span className="hidden sm:inline text-outline-variant">·</span>
        <Link to="/privacy" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
}
