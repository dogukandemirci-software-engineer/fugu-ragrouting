import { useState } from 'react';
import { Copy, Gift } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfileMutation, useDeleteOrganizationMutation } from '../../store/api/accountApi';
import { useLogoutMutation, useListMyOrganizationsQuery } from '../../store/api/authApi';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user, organizationId } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [deleteOrganization, { isLoading: deleting }] = useDeleteOrganizationMutation();
  const [logout] = useLogoutMutation();
  const { data: orgsData } = useListMyOrganizationsQuery();

  const currentOrg = orgsData?.organizations.find((o) => o.id === organizationId);
  const referralLink = currentOrg ? `${window.location.origin}/sign-up?ref=${currentOrg.slug}` : '';

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied');
  };

  const handleSave = async () => {
    try {
      await updateProfile({ full_name: fullName }).unwrap();
      toast.success('Settings saved');
    } catch {
      toast.error('Could not save settings. Please try again.');
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      await deleteOrganization().unwrap();
      toast.success('Organization scheduled for deletion in 30 days');
      setConfirmDeleteOpen(false);
      await logout();
    } catch {
      toast.error('Could not delete organization. Please try again.');
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Settings" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-2xl">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Settings</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your account and organization settings.</p>
        </div>

        <Card>
          <h2 className="text-headline-md font-headline font-semibold text-on-surface mb-4">Profile</h2>
          <div className="space-y-4">
            <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            <Input label="Email" value={user?.email ?? ''} disabled hint="Email cannot be changed here" />
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="brand" onClick={handleSave} loading={saving}>Save changes</Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Gift size={18} className="text-accent-violet" />
            <h2 className="text-headline-md font-headline font-semibold text-on-surface">Invite & earn</h2>
          </div>
          <p className="text-body-sm text-on-surface-variant mb-4">
            Share your referral link — when someone signs up with it, your organization and theirs each get 500 bonus queries per month.
          </p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="flex-1" />
            <Button variant="secondary" onClick={copyReferralLink} disabled={!referralLink}>
              <Copy size={14} /> Copy
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-headline-md font-headline font-semibold text-on-surface mb-2">Danger zone</h2>
          <p className="text-body-sm text-on-surface-variant mb-4">
            Deleting your organization is permanent. All data will be scheduled for deletion after 30 days (GDPR compliance).
          </p>
          <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            Delete organization
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete organization"
        description="This will schedule your entire organization — including all documents, team members, and API keys — for permanent deletion in 30 days. You will be logged out immediately. This cannot be undone."
        confirmLabel="Delete organization"
        loading={deleting}
        onConfirm={handleDeleteOrganization}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
