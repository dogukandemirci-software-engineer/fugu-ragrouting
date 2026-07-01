import React from 'react';
import { Bell } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

export function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    })
      .then(r => r.json())
      .then(d => { setNotifications(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Notifications" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Notifications</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Recent activity in your organization.</p>
        </div>

        {loading && <SkeletonLoader lines={5} />}

        {!loading && notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-accent-violet/10 flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-accent-violet" />
            </div>
            <p className="text-body-md text-on-surface-variant">All caught up! No notifications.</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <Card padding="sm">
            <div className="divide-y divide-outline-variant">
              {notifications.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 py-4 px-4">
                  <div className="w-8 h-8 rounded-full bg-accent-violet/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell size={14} className="text-accent-violet" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-on-surface">{n.action.replace(/\./g, ' › ')}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
