import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { RadialGauge } from '../../components/ui/RadialGauge';
import { useGetSubscriptionQuery, useCreateCheckoutMutation, useListPlansQuery } from '../../store/api/billingApi';
import toast from 'react-hot-toast';

export function UsageBillingPage() {
  const { data, isLoading } = useGetSubscriptionQuery();
  const { data: plansData } = useListPlansQuery();
  const [createCheckout, { isLoading: checkoutLoading }] = useCreateCheckoutMutation();
  const PLANS = plansData?.plans ?? [];

  const sub = data?.subscription;
  const usage = data?.usage;
  const percent = usage ? Math.min((usage.query_count / usage.monthly_query_limit) * 100, 100) : 0;

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    try {
      const { url } = await createCheckout({ tier }).unwrap();
      window.location.href = url;
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Usage & Billing" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Usage & Billing</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Monitor your usage and manage your subscription.</p>
        </div>

        {isLoading ? <SkeletonLoader lines={6} /> : (
          <>
            {/* Current plan */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-label-caps text-on-surface-variant font-code mb-1">Current plan</p>
                  <div className="flex items-center gap-3">
                    <span className="text-headline-md font-headline font-bold text-on-surface capitalize">{sub?.tier ?? 'Free'}</span>
                    <Badge variant={sub?.status === 'active' ? 'success' : 'error'}>{sub?.status ?? 'active'}</Badge>
                  </div>
                </div>
                {sub?.current_period_end && (
                  <div className="text-right">
                    <p className="text-label-caps text-on-surface-variant font-code mb-1">Renews</p>
                    <p className="text-body-sm text-on-surface">{new Date(sub.current_period_end).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Usage gauge */}
              <div className="flex items-center gap-6">
                <RadialGauge percent={percent} danger={percent >= 80} size={104} strokeWidth={8} />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-body-sm text-on-surface-variant">Monthly queries</span>
                    <span className="text-body-sm font-medium text-on-surface">
                      {usage?.query_count.toLocaleString() ?? 0} / {usage?.monthly_query_limit.toLocaleString() ?? 1000}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    {percent >= 80
                      ? 'Approaching your monthly limit — consider upgrading to avoid interruptions.'
                      : 'Usage resets at the start of each billing period.'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = (sub?.tier ?? 'free') === plan.tier;
                return (
                  <div
                    key={plan.tier}
                    className={`rounded-card border p-6 flex flex-col ${isCurrent ? 'border-accent-violet/50 bg-accent-violet/5' : 'border-outline-variant bg-surface-container-lowest'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-headline-md font-headline font-bold text-on-surface">{plan.label}</h3>
                      {isCurrent && <Badge variant="full-access">Current</Badge>}
                    </div>
                    <p className="text-3xl font-headline font-bold text-on-surface mb-1">{plan.price}</p>
                    <p className="text-body-sm text-on-surface-variant mb-4">{plan.tier !== 'enterprise' ? '/month' : ''}</p>
                    <ul className="space-y-2 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-body-sm text-on-surface">
                          <span className="w-4 h-4 rounded-full bg-accent-teal-glow/20 text-accent-violet flex items-center justify-center text-[10px]">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && plan.tier !== 'free' && (
                      <Button
                        variant="brand"
                        className="w-full justify-center"
                        loading={checkoutLoading}
                        onClick={() => handleUpgrade(plan.tier as 'pro' | 'enterprise')}
                      >
                        {plan.tier === 'enterprise' ? 'Contact sales' : 'Upgrade'}
                      </Button>
                    )}
                    {!isCurrent && plan.tier === 'free' && (
                      <Button variant="secondary" className="w-full justify-center" disabled>
                        Downgrade
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
