import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => setStatus(r.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [params]);

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-body-md text-on-surface-variant">Verifying your email…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'success' ? 'bg-success-green-bg' : 'bg-error-container'}`}>
        {status === 'success'
          ? <CheckCircle size={28} className="text-success-green" />
          : <XCircle size={28} className="text-error" />
        }
      </div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-2">
        {status === 'success' ? 'Email verified!' : 'Verification failed'}
      </h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        {status === 'success'
          ? 'Your email has been verified. You can now use all features.'
          : 'The link may have expired or already been used.'
        }
      </p>
      <Link
        to={status === 'success' ? '/dashboard' : '/log-in'}
        className="btn-brand inline-flex"
      >
        {status === 'success' ? 'Go to dashboard' : 'Back to log in'}
      </Link>
    </div>
  );
}
