import { useState, useEffect } from 'react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

export function AuditLogsPage() {
  // Direct fetch since we don't want a full slice for read-only audit logs
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs?limit=50', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Audit Logs" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Audit Logs</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Track all actions taken within your organization.</p>
        </div>

        {loading && <SkeletonLoader lines={5} />}

        {!loading && logs.length === 0 && (
          <div className="text-center py-16">
            <p className="text-body-md text-on-surface-variant">No audit log entries yet.</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <Card padding="sm">
            <div className="divide-y divide-outline-variant">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center gap-4 py-3.5 px-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-on-surface">{log.action.replace(/\./g, ' › ')}</p>
                    {log.resource_id && (
                      <p className="text-[11px] text-on-surface-variant mt-0.5 font-code">{log.resource_id}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
