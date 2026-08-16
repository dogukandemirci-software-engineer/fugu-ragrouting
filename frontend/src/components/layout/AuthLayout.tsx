import { Outlet } from 'react-router-dom';
import { LogoMark } from '../ui/Logo';
import { MagicCard } from '../ui/magicui/MagicCard';
import { BorderBeam } from '../ui/magicui/BorderBeam';

const FEATURE_PILLS = ['Vector search', 'Graph routing', 'Hybrid retrieval', 'JWT sessions'];

export function AuthLayout() {
  return (
    <div className="auth-grid min-h-screen text-black">
      <div className="auth-orb -left-32 -top-32" aria-hidden="true" />
      <div className="auth-orb -bottom-40 right-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        <div className="hidden lg:block">
          <div className="mb-10 flex items-center gap-3">
            <LogoMark size={42} className="rounded-xl grayscale" />
            <div>
              <div className="text-xl font-bold tracking-tight">FUGU</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/50">RAG infrastructure</div>
            </div>
          </div>
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-black/45">Private AI routing layer</p>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.02] tracking-[-0.06em] xl:text-7xl">
            Your data.
            <br />
            <span className="text-black/45">Routed precisely.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-black/60">
            A focused workspace for routing every question across vector and graph retrieval with a secure JWT session.
          </p>
          <div className="mt-9 flex max-w-md flex-wrap gap-2">
            {FEATURE_PILLS.map((pill) => (
              <span key={pill} className="rounded-full border border-black/15 bg-white/60 px-3 py-1.5 text-xs font-medium text-black/65 backdrop-blur">
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <MagicCard className="relative w-full max-w-md p-7 sm:p-9">
            <BorderBeam />
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <LogoMark size={36} className="rounded-lg grayscale" />
              <div>
                <div className="text-lg font-bold tracking-tight">FUGU</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">RAG infrastructure</div>
              </div>
            </div>
            <Outlet />
          </MagicCard>
        </div>
      </div>
    </div>
  );
}
