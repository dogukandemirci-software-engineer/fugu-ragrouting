import { RefreshCw } from 'lucide-react';

export function ServerErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div
        className="text-[120px] font-headline font-bold leading-none mb-6"
        style={{ background: 'linear-gradient(135deg, #ba1a1a, #8B3A2B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        500
      </div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-3">Something went wrong</h1>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-sm">
        We're experiencing a temporary issue. Our team has been notified.
      </p>
      <button onClick={() => window.location.reload()} className="btn-brand inline-flex">
        <RefreshCw size={16} /> Try again
      </button>
    </div>
  );
}
