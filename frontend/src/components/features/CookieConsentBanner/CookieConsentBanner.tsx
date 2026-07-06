import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'fugu_cookie_consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const choose = (choice: 'accepted' | 'rejected') => {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-[100] border-t border-white/10 bg-ink-dark/95 backdrop-blur-xl px-6 py-4 animate-fade-in-up"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="flex-1 text-[13px] text-white/70 leading-relaxed">
          We use essential cookies to keep you signed in and, optionally, analytics cookies to
          improve FUGU. See our{' '}
          <Link to="/privacy" className="underline text-white/90 hover:text-white">
            Privacy Policy
          </Link>{' '}
          for details on data processing and your rights.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => choose('rejected')}
            className="px-3.5 py-2 text-[13px] font-medium text-white/70 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          >
            Reject non-essential
          </button>
          <button
            onClick={() => choose('accepted')}
            className="px-3.5 py-2 text-[13px] font-semibold text-white bg-brand-indigo rounded-lg hover:opacity-90 transition-all"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
