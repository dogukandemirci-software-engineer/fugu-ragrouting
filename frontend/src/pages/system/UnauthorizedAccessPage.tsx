import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export function UnauthorizedAccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center mb-6">
        <Lock size={36} className="text-error" />
      </div>
      <h1 className="text-headline-lg font-headline font-bold text-on-surface mb-3">Access revoked</h1>
      <p className="text-body-md text-on-surface-variant mb-8 max-w-sm">
        Your API key has been revoked or is no longer valid. Please create a new key or contact your organization admin.
      </p>
      <div className="flex gap-3">
        <Link to="/dashboard/api-keys" className="btn-brand inline-flex">
          Manage API keys
        </Link>
        <Link to="/dashboard" className="btn-secondary inline-flex">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
