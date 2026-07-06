import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useListAuditLogsQuery } from '../../store/api/auditApi';
import { getActionMeta } from '../../utils/auditActionMeta';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading: loading, isError, refetch } = useListAuditLogsQuery({ limit: 50 });
  const logs = useMemo(() => data?.logs ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const actorName = log.actor_full_name ?? log.actor_email ?? '';
      return (
        log.action.toLowerCase().includes(q) ||
        actorName.toLowerCase().includes(q) ||
        (log.resource_id ?? '').toLowerCase().includes(q)
      );
    });
  }, [logs, search]);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Audit Logs" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">Audit Logs</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Track all actions taken within your organization.</p>
          </div>
          {logs.length > 0 && (
            <div className="w-full sm:w-72">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by action, person, or resource…"
                leftIcon={<Search size={14} />}
              />
            </div>
          )}
        </div>

        {loading && <SkeletonLoader lines={5} />}

        {!loading && isError && (
          <ErrorState title="Couldn't load audit logs" description="Something went wrong while fetching the audit log." onRetry={refetch} />
        )}

        {!loading && !isError && logs.length === 0 && (
          <EmptyState icon={ScrollText} title="No audit log entries yet" description="Actions taken within your organization will appear here." />
        )}

        {!loading && !isError && logs.length > 0 && filtered.length === 0 && (
          <EmptyState icon={Search} title="No matches" description={`No audit log entries match "${search}".`} />
        )}

        {!loading && !isError && filtered.length > 0 && (
          <Card padding="sm">
            <div className="divide-y divide-outline-variant">
              {filtered.map((log) => {
                const { icon: Icon, colorClass, label } = getActionMeta(log.action);
                const actorName = log.actor_full_name || log.actor_email;
                return (
                  <div key={log.id} className="flex items-start gap-3 py-3.5 px-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm font-medium text-on-surface">{label}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {actorName && (
                            <span className="text-[11px] text-on-surface-variant">{actorName}</span>
                          )}
                          {log.resource_id && (
                            <span className="text-[11px] text-on-surface-variant font-code truncate">{log.resource_id}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-on-surface-variant shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
