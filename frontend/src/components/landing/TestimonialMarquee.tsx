import { Quote } from 'lucide-react';
import { Marquee } from '../magicui/marquee';

// Illustrative example feedback, not real customer testimonials — FUGU has
// no collected user quotes yet. Content is grounded in the real architecture
// (BYOK, org-scoped tenant isolation, hybrid routing) rather than generic
// SaaS praise, and roles are generic/anonymous rather than fabricated named
// people, to avoid manufacturing false social proof.
const EXAMPLE_FEEDBACK = [
  { role: 'Platform Engineer', quote: 'The hybrid routing genuinely picks graph vs vector correctly most of the time — we stopped hand-tuning retrieval per query type.' },
  { role: 'Security Lead', quote: 'Tenant isolation enforced at the DB layer, not just application code, was the deciding factor for us.' },
  { role: 'ML Infra Engineer', quote: 'BYOK meant we could keep using our existing Anthropic contract instead of paying a retrieval markup.' },
  { role: 'Backend Engineer', quote: 'Citations map back to actual source chunks — no more guessing whether an answer is grounded.' },
  { role: 'Founding Engineer', quote: 'Self-hosted the SDK against our own deployment in an afternoon. Docs matched the real API.' },
  { role: 'Data Engineer', quote: 'Watching the classifier explain its routing decision per-query made debugging retrieval quality actually tractable.' },
];

function Card({ role, quote }: { role: string; quote: string }) {
  return (
    <div className="w-[320px] rounded-[12px] border border-outline-variant bg-surface-container-lowest p-5 mx-2">
      <Quote size={18} className="text-accent-violet/50 mb-3" />
      <p className="text-[14px] text-on-surface leading-relaxed mb-4">{quote}</p>
      <p className="text-[12px] text-outline uppercase tracking-wider font-semibold">{role}</p>
    </div>
  );
}

export function TestimonialMarquee() {
  return (
    <div>
      <p className="text-center text-[12px] text-outline uppercase tracking-wider font-semibold mb-6">
        Example feedback — illustrative, not collected customer quotes
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <Marquee reverse pauseOnHover className="[--duration:35s]">
          {EXAMPLE_FEEDBACK.map((item) => (
            <Card key={item.role} {...item} />
          ))}
        </Marquee>
      </div>
    </div>
  );
}
