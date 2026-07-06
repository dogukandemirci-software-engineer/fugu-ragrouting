import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div
        className="text-[120px] font-headline font-bold leading-none mb-6"
        style={{ background: 'linear-gradient(135deg, #C15F3C, #D4A24E, #8B3A2B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        404
      </div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-3">Page not found</h1>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-sm">
        This page doesn't exist or may have been moved.
      </p>
      <Link to="/dashboard" className="btn-brand inline-flex">
        <Home size={16} /> Go to dashboard
      </Link>
    </div>
  );
}
