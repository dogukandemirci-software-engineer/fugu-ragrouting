import { Link } from 'react-router-dom';
import { Search, FileText, Key, TrendingUp, Zap, ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { TopBar } from '../../components/layout/TopBar';
import { useAuth } from '../../hooks/useAuth';
import { useGetSubscriptionQuery } from '../../store/api/billingApi';
import { useListDocumentsQuery } from '../../store/api/documentApi';
import { useListApiKeysQuery } from '../../store/api/apiKeyApi';
import { useListQueryLogsQuery } from '../../store/api/queryApi';
function StatCard({ label, value, icon: Icon, href }: { label: string; value: string | number; icon: LucideIcon; href: string }) {
  return (
    <Link to={href}>
      <Card className="hover:border-accent-violet/30 hover:shadow-accent-sm transition-all duration-150 group">
        <div className="flex items-center justify-between mb-4">
          <span className="text-label-caps text-on-surface-variant font-code">{label}</span>
          <div className="w-9 h-9 rounded-lg bg-accent-violet/10 flex items-center justify-center group-hover:bg-accent-violet/20 transition-colors">
            <Icon size={16} className="text-accent-violet" />
          </div>
        </div>
        <p className="text-3xl font-headline font-bold text-on-surface">{value}</p>
      </Card>
    </Link>
  );
}

export function DashboardHomePage() {
  const { user } = useAuth();
  const { data: billing } = useGetSubscriptionQuery();
  const { data: docs } = useListDocumentsQuery();
  const { data: keys } = useListApiKeysQuery();
  const { data: queries } = useListQueryLogsQuery({ limit: 5 });

  const usagePercent = billing
    ? Math.round((billing.usage.query_count / billing.usage.monthly_query_limit) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">
            Good morning, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Here's what's happening with your RAG pipeline today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Queries" value={billing?.usage.query_count ?? '—'} icon={Search} href="/dashboard/queries" />
          <StatCard label="Documents" value={docs?.documents.length ?? '—'} icon={FileText} href="/dashboard/documents" />
          <StatCard label="API Keys" value={keys?.keys.filter(k => !k.revoked_at).length ?? '—'} icon={Key} href="/dashboard/api-keys" />
          <StatCard label="Usage" value={`${usagePercent}%`} icon={TrendingUp} href="/dashboard/billing" />
        </div>

        {/* Usage progress */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-body-sm font-medium text-on-surface">Monthly Query Usage</span>
            <span className="text-body-sm text-on-surface-variant">
              {billing?.usage.query_count ?? 0} / {billing?.usage.monthly_query_limit ?? 1000}
            </span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usagePercent, 100)}%`,
                background: usagePercent >= 80 ? '#ba1a1a' : 'linear-gradient(90deg, #7B2FF7, #3FFFC0)',
                boxShadow: '0 0 15px rgba(123,47,247,0.3)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[11px] text-on-surface-variant">{billing?.subscription?.tier?.toUpperCase() ?? 'FREE'} plan</span>
            <Link to="/dashboard/billing" className="text-[11px] text-accent-violet hover:underline">Upgrade</Link>
          </div>
        </Card>

        {/* Quick actions */}
        <div>
          <h2 className="text-body-md font-medium text-on-surface mb-3">Quick actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Run a query', desc: 'Test the routing engine', icon: Zap, href: '/dashboard/queries' },
              { label: 'Upload document', desc: 'Add to your knowledge base', icon: FileText, href: '/dashboard/documents' },
              { label: 'Create API key', desc: 'Connect your application', icon: Key, href: '/dashboard/api-keys' },
            ].map((item) => (
              <Link key={item.href} to={item.href}>
                <div className="flex items-center gap-3 p-4 rounded-card border border-outline-variant hover:border-accent-violet/30 hover:bg-surface-container-low transition-all duration-150 group">
                  <div className="w-9 h-9 rounded-lg bg-accent-violet/10 flex items-center justify-center shrink-0">
                    <item.icon size={16} className="text-accent-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-on-surface">{item.label}</p>
                    <p className="text-[12px] text-on-surface-variant">{item.desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-on-surface-variant group-hover:text-accent-violet transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent queries */}
        {queries?.logs && queries.logs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-body-md font-medium text-on-surface">Recent queries</h2>
              <Link to="/dashboard/queries" className="text-body-sm text-accent-violet hover:underline">View all</Link>
            </div>
            <Card padding="sm">
              <div className="divide-y divide-outline-variant">
                {queries.logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-3 px-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-on-surface truncate">{log.query_text}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {log.routing_strategy.replace('_', ' ')} · {log.response_time_ms}ms
                      </p>
                    </div>
                    <span className="text-[11px] text-on-surface-variant shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
