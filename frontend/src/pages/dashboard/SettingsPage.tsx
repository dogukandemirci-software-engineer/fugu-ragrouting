import { useEffect, useState } from 'react';
import { Copy, Gift, KeyRound, CheckCircle2 } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfileMutation, useDeleteOrganizationMutation } from '../../store/api/accountApi';
import { useLogoutMutation, useListMyOrganizationsQuery } from '../../store/api/authApi';
import {
  useGetCredentialQuery,
  useSaveCredentialMutation,
  useRemoveCredentialMutation,
  LLMCredentialProvider,
} from '../../store/api/credentialApi';
import { SUPPORTED_LLM_MODELS, PROVIDER_LABELS } from '../../config/llmCredentialModels';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user, organizationId } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();
  const [deleteOrganization, { isLoading: deleting }] = useDeleteOrganizationMutation();
  const [logout] = useLogoutMutation();
  const { data: orgsData } = useListMyOrganizationsQuery();

  const { data: credentialData, isLoading: credentialLoading } = useGetCredentialQuery();
  const [saveCredential, { isLoading: savingCredential }] = useSaveCredentialMutation();
  const [removeCredential, { isLoading: removingCredential }] = useRemoveCredentialMutation();
  const [provider, setProvider] = useState<LLMCredentialProvider>('anthropic');
  const [model, setModel] = useState(SUPPORTED_LLM_MODELS.anthropic[0]);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (credentialData?.credential) {
      setProvider(credentialData.credential.provider);
      setModel(credentialData.credential.model);
    }
  }, [credentialData]);

  const handleProviderChange = (next: LLMCredentialProvider) => {
    setProvider(next);
    setModel(SUPPORTED_LLM_MODELS[next][0]);
  };

  const handleSaveCredential = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter an API key first');
      return;
    }
    try {
      await saveCredential({ provider, model, apiKey: apiKey.trim() }).unwrap();
      setApiKey('');
      toast.success('Key verified and saved');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? 'Could not verify this key. Check it and try again.');
    }
  };

  const handleRemoveCredential = async () => {
    try {
      await removeCredential().unwrap();
      toast.success('Credential removed');
    } catch {
      toast.error('Could not remove credential. Please try again.');
    }
  };

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
            <KeyRound size={18} className="text-accent-violet" />
            <h2 className="text-headline-md font-headline font-semibold text-on-surface">Your LLM API key (BYOK)</h2>
          </div>
          <p className="text-body-sm text-on-surface-variant mb-4">
            Answers are generated using your own API key from one of the providers below — your organization pays that provider directly, not FUGU. Without a key configured, queries will return an error asking you to add one.
          </p>

          {!credentialLoading && credentialData?.credential && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant">
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <p className="text-body-sm text-on-surface">
                {PROVIDER_LABELS[credentialData.credential.provider]} · {credentialData.credential.model} · key ending in {credentialData.credential.keyLastFour}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-body-sm font-medium text-on-surface mb-1.5">Provider</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as LLMCredentialProvider)}
                className="w-full px-3 py-2.5 text-body-sm font-body text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet/30 focus:border-accent-violet"
              >
                {(Object.keys(PROVIDER_LABELS) as LLMCredentialProvider[]).map((p) => (
                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-body-sm font-medium text-on-surface mb-1.5">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 text-body-sm font-body text-on-surface bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet/30 focus:border-accent-violet"
              >
                {SUPPORTED_LLM_MODELS[provider].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="API key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={credentialData?.credential ? 'Enter a new key to replace the current one' : 'sk-...'}
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            {credentialData?.credential && (
              <Button variant="destructive" onClick={handleRemoveCredential} loading={removingCredential}>
                Remove
              </Button>
            )}
            <Button variant="brand" onClick={handleSaveCredential} loading={savingCredential}>
              Test &amp; save
            </Button>
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
