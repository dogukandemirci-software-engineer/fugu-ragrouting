import { Outlet, Link } from 'react-router-dom';
import { LogoMark } from '../ui/Logo';

const FEATURE_PILLS = [
  { label: 'Vector Search', className: 'border-accent-violet/40 bg-accent-violet/15' },
  { label: 'Graph Routing', className: 'border-accent-teal-glow/40 bg-accent-teal-glow/15' },
  { label: 'Hybrid Mode', className: 'border-accent-magenta/40 bg-accent-magenta/15' },
  { label: 'Auto-classify', className: 'border-secondary/40 bg-secondary/15' },
];

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left: form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-surface-container-lowest lg:max-w-[480px] xl:max-w-[520px] relative z-10">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <LogoMark size={36} className="rounded-xl" />
            <div>
              <div className="text-[19px] font-headline font-semibold text-primary leading-tight">FUGU</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant leading-none">
                RAG Infrastructure
              </div>
            </div>
          </Link>

          <Outlet />
        </div>
      </div>

      {/* Right: warm ink panel — deliberate contrast with the paper-toned form side */}
      <div className="hidden lg:block flex-1 relative overflow-hidden panel-dark">
        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none bg-accent-violet/[0.22] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] pointer-events-none bg-accent-magenta/[0.18] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-3/4 left-1/3 w-48 h-48 rounded-full blur-[80px] pointer-events-none bg-accent-teal-glow/[0.14] animate-float" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-16">
          {/* Top badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full w-fit text-white text-[13px] font-medium backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-accent-teal-glow shadow-teal-glow" />
            Intelligent RAG Routing
          </div>

          {/* Center content */}
          <div>
            <h2 className="font-headline text-[46px] leading-[1.15] font-semibold text-white mb-6 tracking-tight">
              Route queries
              <span className="block brand-gradient-text">
                with AI precision
              </span>
            </h2>
            <p className="text-[17px] text-white/60 leading-relaxed max-w-md mb-10">
              FUGU automatically routes your queries between vector and graph backends,
              delivering the most relevant results every time.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {FEATURE_PILLS.map(({ label, className }) => (
                <span
                  key={label}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border text-white/90 backdrop-blur-sm ${className}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: '< 200ms', label: 'Avg latency' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '10M+', label: 'Queries routed' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="font-headline text-[24px] font-semibold text-white mb-1">{value}</div>
                <div className="text-[12px] text-white/50 uppercase tracking-wider font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
