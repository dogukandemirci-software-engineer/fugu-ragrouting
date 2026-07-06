import { useMemo, useState } from 'react';
import { Bell, Users, Search } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useListNotificationsQuery } from '../../store/api/auditApi';
import {
  useListPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '../../store/api/teamApi';
import { useSwitchOrgMutation } from '../../store/api/authApi';
import { getActionMeta } from '../../utils/auditActionMeta';
import toast from 'react-hot-toast';

function PendingInvitations() {
  const { data, isLoading } = useListPendingInvitationsQuery();
  const [accept, { isLoading: accepting }] = useAcceptInvitationMutation();
  const [decline, { isLoading: declining }] = useDeclineInvitationMutation();
  const [switchOrg] = useSwitchOrgMutation();
  const invitations = data?.invitations ?? [];

  if (isLoading || invitations.length === 0) return null;

  const handleAccept = async (orgId: string, orgName: string) => {
    try {
      await accept(orgId).unwrap();
      // Switch the active JWT to the newly-joined org and reload so every
      // cached list (documents, queries, team, etc.) refetches scoped to it
      // — login/refresh alone always default back to the user's oldest org.
      await switchOrg(orgId).unwrap();
      toast.success(`Joined ${orgName}`);
      window.location.reload();
    } catch {
      toast.error('Failed to accept invitation');
    }
  };

  const handleDecline = async (orgId: string, orgName: string) => {
    try {
      await decline(orgId).unwrap();
      toast.success(`Declined invitation to ${orgName}`);
    } catch {
      toast.error('Failed to decline invitation');
    }
  };

  return (
    <Card padding="sm">
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-body-sm font-bold text-on-surface">Team invitations</h2>
      </div>
      <div className="divide-y divide-outline-variant">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 py-4 px-4">
            <div className="w-8 h-8 rounded-full bg-accent-violet/10 flex items-center justify-center shrink-0">
              <Users size={14} className="text-accent-violet" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm text-on-surface">
                {inv.invited_by_email ?? 'Someone'} invited you to join <span className="font-medium">{inv.org_name}</span> as {inv.role}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{new Date(inv.invited_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" disabled={accepting || declining} onClick={() => handleDecline(inv.organization_id, inv.org_name)}>
                Decline
              </Button>
              <Button variant="brand" size="sm" loading={accepting} disabled={declining} onClick={() => handleAccept(inv.organization_id, inv.org_name)}>
                Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NotificationsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading: loading, isError, refetch } = useListNotificationsQuery();
  const notifications = useMemo(() => data?.notifications ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return notifications;
    const q = search.toLowerCase();
    return notifications.filter((n: any) => {
      const actorName = n.actor_full_name ?? n.actor_email ?? '';
      return n.action.toLowerCase().includes(q) || actorName.toLowerCase().includes(q);
    });
  }, [notifications, search]);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Notifications" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">Notifications</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Recent activity in your organization.</p>
          </div>
          {notifications.length > 0 && (
            <div className="w-full sm:w-72">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity…"
                leftIcon={<Search size={14} />}
              />
            </div>
          )}
        </div>

        <PendingInvitations />

        {loading && <SkeletonLoader lines={5} />}

        {!loading && isError && (
          <ErrorState title="Couldn't load notifications" description="Something went wrong while fetching your notifications." onRetry={refetch} />
        )}

        {!loading && !isError && notifications.length === 0 && (
          <EmptyState icon={Bell} title="All caught up!" description="No notifications right now." />
        )}

        {!loading && !isError && notifications.length > 0 && filtered.length === 0 && (
          <EmptyState icon={Search} title="No matches" description={`No activity matches "${search}".`} />
        )}

        {!loading && !isError && filtered.length > 0 && (
          <Card padding="sm">
            <div className="divide-y divide-outline-variant">
              {filtered.map((n: any) => {
                const { icon: Icon, colorClass, label } = getActionMeta(n.action);
                const actorName = n.actor_full_name || n.actor_email;
                return (
                  <div key={n.id} className="flex items-start gap-3 py-4 px-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm text-on-surface break-words">{label}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {actorName && <span className="text-[11px] text-on-surface-variant">{actorName}</span>}
                        <span className="text-[11px] text-on-surface-variant">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
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
