import { Outlet, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left: form panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-surface-container-lowest lg:max-w-lg xl:max-w-xl">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3FFFC0 100%)' }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-headline-md font-headline font-bold text-on-surface">FUGU</span>
          </Link>
          <Outlet />
        </div>
      </div>

      {/* Right: brand panel */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a1a 100%)' }}
      >
        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[100px] bg-accent-violet/20" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] bg-accent-magenta/20" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-white text-body-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-teal-glow" />
            Intelligent RAG Routing
          </div>
          <h2 className="text-headline-xl font-headline font-bold text-white mb-6">
            Route queries with
            <span className="gradient-text block">AI precision</span>
          </h2>
          <p className="text-body-lg text-white/60 leading-relaxed max-w-md">
            FUGU automatically routes your queries between vector and graph backends,
            delivering the most relevant results every time.
          </p>
        </div>
      </div>
    </div>
  );
}
