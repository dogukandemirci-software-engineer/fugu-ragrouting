import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';

const SECTION_CLASS = 'space-y-3';
const HEADING_CLASS = 'text-[20px] font-semibold text-white mt-10 mb-3';

export function PrivacyPolicyPage() {
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
        <h1 className="font-headline text-[32px] font-semibold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-[13px] mb-10">Last updated: July 2026</p>

        <div className={SECTION_CLASS}>
          <p>
            This policy describes how FUGU ("we", "us") collects, uses, and protects personal
            data when you use our retrieval-augmented generation platform, in line with the EU
            General Data Protection Regulation (GDPR) and the Turkish Personal Data Protection
            Law No. 6698 (KVKK).
          </p>
        </div>

        <h2 className={HEADING_CLASS}>Data we collect</h2>
        <div className={SECTION_CLASS}>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Account data: email address, full name, password (stored as a bcrypt hash, never in plain text), and organization name.</li>
            <li>OAuth data (if you sign in with Google): your Google account ID and profile picture.</li>
            <li>Content you upload: documents you ingest into your organization's knowledge base, and the text of queries you submit.</li>
            <li>Usage and security data: API key metadata, audit logs (including IP address and browser/user-agent for actions like login and key creation), and query logs.</li>
          </ul>
        </div>

        <h2 className={HEADING_CLASS}>Legal basis for processing</h2>
        <div className={SECTION_CLASS}>
          <p>
            We process account and billing data under contract necessity (to provide the
            service you signed up for), and security/audit data under our legitimate interest in
            keeping the platform secure and abuse-free. Where required, we rely on your consent
            (see the cookie banner shown on this site).
          </p>
        </div>

        <h2 className={HEADING_CLASS}>Third-party processors</h2>
        <div className={SECTION_CLASS}>
          <p>
            To generate answers and route queries, the content of your documents and queries may
            be sent to a large-language-model provider configured for your deployment — this can
            be a self-hosted model (no data leaves our infrastructure) or a third-party API such
            as OpenAI, Anthropic, or OpenRouter, depending on configuration. Payment data is
            processed by Stripe and never touches our servers directly.
          </p>
        </div>

        <h2 className={HEADING_CLASS}>Cross-border data transfers</h2>
        <div className={SECTION_CLASS}>
          <p>
            When a third-party LLM provider is configured, query and document content may be
            processed outside Turkey and the European Economic Area. Under KVKK Article 9 (as
            amended by Law No. 7499), such transfers rely on an adequacy decision or appropriate
            safeguards (standard contractual clauses / binding corporate rules) with that
            provider, rather than on blanket consent. Under GDPR, the same transfer relies on
            Standard Contractual Clauses or an adequacy decision as applicable. Contact us if you
            need details of the specific safeguard in place for your organization's configured
            provider.
          </p>
        </div>

        <h2 className={HEADING_CLASS}>Retention</h2>
        <div className={SECTION_CLASS}>
          <p>
            We retain your data for as long as your account is active. If you request
            organization deletion, your data is soft-deleted immediately and permanently erased
            after 30 days, giving you a window to cancel the request.
          </p>
        </div>

        <h2 className={HEADING_CLASS}>Your rights</h2>
        <div className={SECTION_CLASS}>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-white">Access &amp; portability:</strong> export a machine-readable copy of your organization's data from Settings → Export Data, or via the API at <code className="font-mono text-[13px] bg-white/10 px-1.5 py-0.5 rounded">GET /api/account/export</code>.</li>
            <li><strong className="text-white">Erasure:</strong> request deletion of your organization from Settings. We respond to erasure requests without undue delay and within one month (extendable to two months for complex requests), as required by GDPR Art. 17 and KVKK.</li>
            <li><strong className="text-white">Withdrawal of consent:</strong> you can withdraw cookie consent at any time by clearing your browser's local storage for this site, or by contacting us.</li>
          </ul>
        </div>

        <h2 className={HEADING_CLASS}>Contact</h2>
        <div className={SECTION_CLASS}>
          <p>
            For privacy questions or to exercise your data-subject rights, contact your
            organization administrator or reach out via the Support page.
          </p>
        </div>
      </main>
    </div>
  );
}
