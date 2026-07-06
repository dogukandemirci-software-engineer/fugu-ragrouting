import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useListTeamQuery, useInviteMemberMutation, useRemoveMemberMutation } from '../../store/api/teamApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const roleVariant: Record<string, 'full-access' | 'info' | 'neutral'> = {
  owner: 'full-access',
  admin: 'info',
  member: 'neutral',
  viewer: 'neutral',
};

export function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useListTeamQuery();
  const [invite, { isLoading: inviting }] = useInviteMemberMutation();
  const [remove, { isLoading: removing }] = useRemoveMemberMutation();
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);

  const members = data?.members ?? [];

  const handleInvite = async () => {
    try {
      await invite({ email, role }).unwrap();
      setInviteOpen(false);
      setEmail('');
      toast.success(`Invitation sent to ${email}`);
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? 'Invite failed');
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    try {
      await remove(pendingRemove.id).unwrap();
      toast.success(`${pendingRemove.name} removed`);
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setPendingRemove(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Team" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">Team</h1>
            <p className="text-body-md text-on-surface-variant mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <Button variant="brand" onClick={() => setInviteOpen(true)} className="self-start sm:self-auto">
            <Plus size={16} /> Invite member
          </Button>
        </div>

        {isLoading && <SkeletonLoader lines={4} />}

        {!isLoading && isError && (
          <ErrorState title="Couldn't load team" description="Something went wrong while fetching your team members." onRetry={refetch} />
        )}

        {!isLoading && !isError && members.length === 0 && (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite colleagues to collaborate on documents, queries, and API keys within this organization."
            action={
              <Button variant="brand" onClick={() => setInviteOpen(true)}>
                <Plus size={16} /> Invite member
              </Button>
            }
          />
        )}

        {!isLoading && !isError && members.length > 0 && (
          <Card padding="sm">
            <div className="divide-y divide-outline-variant">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 sm:gap-4 py-4 px-4">
                  <div className="w-9 h-9 rounded-full bg-secondary-container text-white flex items-center justify-center text-body-sm font-bold shrink-0">
                    {member.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">{member.full_name}</p>
                    <p className="text-[12px] text-on-surface-variant truncate">{member.email}</p>
                  </div>
                  <Badge variant={roleVariant[member.role] ?? 'neutral'} className="shrink-0">{member.role}</Badge>
                  {!member.joined_at && (
                    <Badge variant="neutral" className="shrink-0">Pending</Badge>
                  )}
                  {member.user_id !== user?.id && member.role !== 'owner' && (
                    <Button variant="ghost" size="sm" onClick={() => setPendingRemove({ id: member.user_id, name: member.full_name })} className="shrink-0">
                      <Trash2 size={14} className="text-error" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member" size="sm">
        <div className="space-y-4">
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
          <div>
            <p className="text-body-sm font-medium text-on-surface mb-2">Role</p>
            <div className="flex gap-2">
              {['admin', 'member', 'viewer'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={`px-3 py-1.5 rounded-lg text-body-sm border capitalize transition-colors ${role === r ? 'bg-secondary-container text-white border-secondary-container' : 'border-outline-variant text-on-surface-variant hover:border-secondary'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="brand" className="flex-1 justify-center" loading={inviting} onClick={handleInvite} disabled={!email}>
              Send invitation
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove team member"
        description={`Remove ${pendingRemove?.name} from the team?`}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
