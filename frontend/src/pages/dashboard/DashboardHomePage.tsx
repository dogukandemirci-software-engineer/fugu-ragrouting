import { Link } from 'react-router-dom';
import { Search, FileText, Key, TrendingUp, Zap, ArrowRight, CheckCircle2, Circle, type LucideIcon } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { RadialGauge } from '../../components/ui/RadialGauge';
import { useAuth } from '../../hooks/useAuth';
import { useGetSubscriptionQuery } from '../../store/api/billingApi';
import { useListDocumentsQuery } from '../../store/api/documentApi';
import { useListApiKeysQuery } from '../../store/api/apiKeyApi';
import { useListQueryLogsQuery } from '../../store/api/queryApi';
import { colors } from '../../theme/tokens';

function MetricCard({
  label,
  value,
  icon: Icon,
  href,
  accentColor,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  accentColor: string;
}) {
  return (
    <Link to={href}>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 hover:border-secondary transition-colors relative overflow-hidden group cursor-pointer">
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-10 -mt-10 transition-all"
          style={{ background: `${accentColor}0D` }}
        />
        <div className="flex justify-between items-center mb-4 text-on-surface-variant text-body-sm">
          <span>{label}</span>
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        <div className="text-[32px] font-bold text-primary leading-tight">{value}</div>
      </div>
    </Link>
  );
}

function QuickActionCard({ label, desc, icon: Icon, href }: { label: string; desc: string; icon: LucideIcon; href: string }) {
  return (
    <Link to={href}>
      <div className="flex items-center gap-3 p-4 rounded-[10px] bg-surface-container-lowest border border-outline-variant hover:border-secondary hover:bg-surface-container-low transition-all group">
        <div className="w-9 h-9 rounded-lg bg-accent-violet/10 flex items-center justify-center shrink-0 group-hover:bg-accent-violet/20 transition-colors">
          <Icon size={16} className="text-accent-violet" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-primary">{label}</p>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{desc}</p>
        </div>
        <ArrowRight size={14} className="text-on-surface-variant group-hover:text-accent-violet transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// New-user activation guide. Renders only until all three core setup steps are
// done, then disappears on its own — no dismiss state to persist, since "has a
// document / key / query" is derived from real data and can't regress to zero
// once the account is genuinely set up.
function OnboardingChecklist({
  hasDocument,
  hasApiKey,
  hasQuery,
}: {
  hasDocument: boolean;
  hasApiKey: boolean;
  hasQuery: boolean;
}) {
  const steps = [
    { done: hasDocument, label: 'Upload your first document', desc: 'Add a PDF, text, or markdown file to your knowledge base.', href: '/dashboard/documents', cta: 'Upload' },
    { done: hasQuery, label: 'Run your first query', desc: 'Ask a question — FUGU routes it across vector and graph search.', href: '/dashboard/queries', cta: 'Query' },
    { done: hasApiKey, label: 'Create an API key', desc: 'Connect the SDK or REST API to your own application.', href: '/dashboard/api-keys', cta: 'Create key' },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] overflow-hidden">
      <div className="px-6 py-5 border-b border-outline-variant bg-background-alt flex items-center justify-between">
        <div>
          <h2 className="text-body-md font-semibold text-primary">Get started with FUGU</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {doneCount} of {steps.length} steps complete — finish setup to unlock the full workflow.
          </p>
        </div>
        <div className="hidden sm:block">
          <RadialGauge percent={(doneCount / steps.length) * 100} size={52} strokeWidth={5} label={`${doneCount}/${steps.length}`} />
        </div>
      </div>
      <div className="divide-y divide-outline-variant">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-4 px-6 py-4">
            {step.done ? (
              <CheckCircle2 size={20} className="text-success-green shrink-0" />
            ) : (
              <Circle size={20} className="text-on-surface-variant/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-body-sm font-medium ${step.done ? 'text-on-surface-variant line-through' : 'text-primary'}`}>
                {step.label}
              </p>
              {!step.done && <p className="text-[12px] text-on-surface-variant mt-0.5">{step.desc}</p>}
            </div>
            {!step.done && (
              <Link
                to={step.href}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-brand-indigo transition-transform hover:scale-[1.03]"
              >
                {step.cta} <ArrowRight size={13} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardHomePage() {
  const { user } = useAuth();
  const { data: billing, isLoading: billingLoading } = useGetSubscriptionQuery();
  const { data: docs, isLoading: docsLoading } = useListDocumentsQuery();
  const { data: keys, isLoading: keysLoading } = useListApiKeysQuery();
  const { data: queries } = useListQueryLogsQuery({ limit: 5 });

  const summaryLoading = billingLoading || docsLoading || keysLoading;
  const queryCount = billing?.usage.query_count ?? 0;
  const queryLimit = billing?.usage.monthly_query_limit ?? 1000;
  const usagePercent = Math.round((queryCount / queryLimit) * 100);

  const hasDocument = (docs?.documents.length ?? 0) > 0;
  const hasApiKey = (keys?.keys.filter((k) => !k.revoked_at).length ?? 0) > 0;
  const hasQuery = queryCount > 0;
  // Show the guide until all three are done. Wait for data so it doesn't flash
  // for returning users mid-load.
  const showOnboarding = !summaryLoading && !(hasDocument && hasApiKey && hasQuery);

  return (
    <div className="flex flex-col min-h-full">
      <TopBar />

      <div className="flex-1 px-6 md:px-12 py-6 space-y-8 max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-headline-lg font-bold text-primary">
              Welcome, {user?.full_name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="text-on-surface-variant text-body-sm mt-1">
              Monitor your RAG infrastructure performance and usage.
            </p>
          </div>
        </div>

        {/* Onboarding checklist (new users only) */}
        {showOnboarding && (
          <OnboardingChecklist hasDocument={hasDocument} hasApiKey={hasApiKey} hasQuery={hasQuery} />
        )}

        {/* Metric cards */}
        {summaryLoading ? (
          <SkeletonLoader lines={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Total Queries" value={queryCount} icon={Search} href="/dashboard/queries" accentColor={colors['accent-violet']} />
            <MetricCard label="Documents" value={docs?.documents.length ?? 0} icon={FileText} href="/dashboard/documents" accentColor={colors['accent-teal-glow']} />
            <MetricCard label="Active API Keys" value={keys?.keys.filter(k => !k.revoked_at).length ?? 0} icon={Key} href="/dashboard/api-keys" accentColor={colors.secondary} />
            <MetricCard label="Usage" value={`${usagePercent}%`} icon={TrendingUp} href="/dashboard/billing" accentColor={colors['accent-magenta']} />
          </div>
        )}

        {/* Usage progress */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-6 flex items-center gap-6">
          <RadialGauge percent={usagePercent} danger={usagePercent >= 80} size={88} strokeWidth={7} />
          <div className="flex-1 min-w-0">
            <h3 className="text-body-sm font-semibold text-primary">Monthly Query Usage</h3>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {queryCount.toLocaleString()} / {queryLimit.toLocaleString()} queries
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                {billing?.subscription?.tier ?? 'FREE'} plan
              </span>
              <Link to="/dashboard/billing" className="text-[11px] text-accent-violet hover:underline font-medium">
                Upgrade →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-body-md font-semibold text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard label="Run a Query" desc="Test the routing engine" icon={Zap} href="/dashboard/queries" />
            <QuickActionCard label="Upload Document" desc="Add to your knowledge base" icon={FileText} href="/dashboard/documents" />
            <QuickActionCard label="Create API Key" desc="Connect your application" icon={Key} href="/dashboard/api-keys" />
          </div>
        </div>

        {/* Recent queries */}
        {queries?.logs && queries.logs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-body-md font-semibold text-primary">Recent Queries</h2>
              <Link to="/dashboard/queries" className="text-body-sm text-accent-violet hover:underline">View all →</Link>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] overflow-hidden">
              <div className="divide-y divide-outline-variant">
                {queries.logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-primary truncate">{log.query_text}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {(log.routing_strategy ?? 'auto').replace('_', ' ')} · {log.response_time_ms}ms
                      </p>
                    </div>
                    <span className="text-[11px] text-on-surface-variant shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
