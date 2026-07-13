import { Link } from 'react-router-dom';
import { ArrowRight, Check, BookOpen, Terminal, ShieldCheck, Lock, Building2, FileCheck2, KeyRound } from 'lucide-react';
import { useListPlansQuery } from '../store/api/billingApi';
import { LogoMark } from '../components/ui/Logo';
import { RevealSection } from '../components/ui/RevealSection';
import { TestimonialMarquee } from '../components/landing/TestimonialMarquee';
import { ProviderOrbit } from '../components/landing/ProviderOrbit';
import { SdkTerminal } from '../components/landing/SdkTerminal';
import { Meteors } from '../components/magicui/meteors';
import { TextAnimate } from '../components/magicui/text-animate';

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
  'Bring your own API key for answer generation',
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
    price: p.price,
    period: p.period,
    limit: p.tier === 'free' ? 'Included query allowance' : `${p.queries} queries / month`,
    features: p.features,
    highlighted: p.highlighted,
    contactUs: p.contactUs,
  }));

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-on-surface">
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
        <Meteors number={18} className="z-[1]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-full text-[13px] font-medium mb-8 text-on-surface-variant animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-accent-violet shadow-accent-glow" />
            One query, two retrieval engines, one automatic router
          </div>

          <h1 className="font-headline text-[48px] md:text-[64px] font-semibold leading-[1.1] tracking-tight mb-6 text-on-surface">
            <TextAnimate animation="blurInUp" by="word" once className="justify-center">
              Stop choosing between
            </TextAnimate>
            <TextAnimate animation="blurInUp" by="word" once delay={0.3} segmentClassName="brand-gradient-text" className="justify-center">
              vector search and graph search
            </TextAnimate>
          </h1>

          <p className="text-[18px] text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up">
            FUGU classifies every query and routes it to pgvector, a graph traversal, or both —
            automatically — then grounds the answer in the actual retrieved chunks. Every
            document, chunk, and graph path is isolated at the database layer, per organization,
            not just filtered in application code.
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
              Read the docs <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 pt-10 border-t border-outline-variant">
            {[
              { value: 'Vector + Graph', label: 'Routed automatically' },
              { value: 'Org-scoped', label: 'Tenant isolation, DB-enforced' },
              { value: 'BYOK', label: 'Bring your own LLM key' },
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

      {/* Security & Compliance */}
      <RevealSection parallax className="py-24 px-6 border-t border-outline-variant relative z-20 bg-background rounded-t-[24px]">
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

      {/* BYOK */}
      <RevealSection className="py-24 px-6 border-t border-outline-variant">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 bg-accent-violet/10 border border-accent-violet/30">
            <KeyRound size={22} className="text-accent-violet" />
          </div>
          <h2 className="font-headline text-[36px] font-semibold mb-4 text-on-surface">Works with your own API key</h2>
          <p className="text-on-surface-variant text-[16px] max-w-xl mx-auto mb-6">
            Answer generation runs on the API key you provide — you pay your LLM provider directly, at their rates, with full visibility into usage. Retrieval, routing, and graph search stay fully managed by FUGU.
          </p>
          <ProviderOrbit />
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
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[28px] font-headline font-semibold text-on-surface">{plan.price}</span>
                  {plan.period && <span className="text-[13px] text-on-surface-variant">/{plan.period}</span>}
                </div>
                <p className="text-[14px] text-on-surface-variant mb-5">{plan.limit}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-on-surface">
                      <Check size={14} className="text-accent-violet shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.contactUs ? (
                  <a
                    href="mailto:sales@fugu-routes.com?subject=Enterprise%20plan%20inquiry"
                    className="block text-center py-2.5 rounded-lg text-[14px] font-semibold text-on-surface border border-outline-variant hover:bg-surface-container transition-all"
                  >
                    Contact us
                  </a>
                ) : (
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
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-outline text-[12px] mt-8">
            Contact us for custom Enterprise pricing and volume discounts.
          </p>
        </div>
      </RevealSection>

      {/* Example feedback */}
      <RevealSection className="py-16 border-t border-outline-variant">
        <TestimonialMarquee />
      </RevealSection>

      {/* Docs / SDK quick start */}
      <RevealSection parallax className="py-20 px-6 border-t border-outline-variant bg-surface-container-lowest/50 relative z-30 rounded-t-[24px]">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5 bg-accent-violet/10 border border-accent-violet/30">
            <Terminal size={22} className="text-accent-violet" />
          </div>
          <h2 className="font-headline text-[26px] font-semibold mb-3 text-on-surface">Up and running in under a minute</h2>
          <p className="text-on-surface-variant text-[15px] max-w-lg mx-auto">
            Install the SDK, drop in your API key, query and upload documents right away.
          </p>
        </div>
        <SdkTerminal />
        <div className="text-center mt-10">
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-[15px] font-semibold text-on-surface border border-outline-variant hover:bg-background transition-all"
          >
            <BookOpen size={16} /> Full docs, streaming & REST reference
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
        <Link to="/faq" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">FAQ</Link>
        <span className="hidden sm:inline text-outline-variant">·</span>
        <Link to="/compare/pinecone" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">vs. Pinecone</Link>
        <span className="hidden sm:inline text-outline-variant">·</span>
        <Link to="/compare/langchain" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">vs. LangChain</Link>
        <span className="hidden sm:inline text-outline-variant">·</span>
        <Link to="/privacy" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
}
