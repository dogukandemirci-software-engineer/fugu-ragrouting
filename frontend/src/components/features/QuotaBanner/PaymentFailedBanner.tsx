import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

// Persistent: does NOT have a dismiss button per spec.
// Only disappears when payment issue is resolved (billing page update → Redux state cleared)
export function PaymentFailedBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-error-container text-on-error-container text-body-sm font-body">
      <CreditCard size={16} className="shrink-0" />
      <span className="flex-1">
        Your latest payment failed. Please{' '}
        <Link to="/dashboard/billing" className="font-semibold underline hover:no-underline">
          update your payment method
        </Link>{' '}
        to maintain access to FUGU.
      </span>
    </div>
  );
}
