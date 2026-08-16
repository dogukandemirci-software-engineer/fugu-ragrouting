import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuotaStatus } from '../../../hooks/useQuotaStatus';

export function QuotaBanner() {
  const { warn, hardBlocked, percent, used, limit, dismiss } = useQuotaStatus();

  if (!warn && !hardBlocked) return null;

  if (hardBlocked) {
    return (
      <div className="flex items-center gap-3 px-6 py-3 bg-error-container text-on-error-container text-body-sm font-body">
        <AlertTriangle size={16} className="shrink-0" />
        <span className="flex-1">
          You've reached your monthly query limit ({limit.toLocaleString()} queries).{' '}
          <Link to="/dashboard/billing" className="font-semibold underline hover:no-underline">
            Upgrade your plan
          </Link>{' '}
          to continue.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-surface-container border-b border-outline-variant text-on-surface text-body-sm font-body">
      <AlertTriangle size={16} className="text-on-surface-variant shrink-0" />
      <span className="flex-1">
        You've used <strong>{Math.round(percent * 100)}%</strong> of your monthly queries ({used.toLocaleString()}/{limit.toLocaleString()}).{' '}
        <Link to="/dashboard/billing" className="font-semibold underline hover:no-underline">
          Upgrade now
        </Link>{' '}
        to avoid interruption.
      </span>
      <button onClick={dismiss} className="p-1 rounded hover:bg-surface-container-high transition-colors shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
