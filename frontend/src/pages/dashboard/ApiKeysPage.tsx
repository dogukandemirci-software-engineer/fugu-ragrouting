import { useState } from 'react';
import { Plus, Key, Copy, Check, Trash2, Eye } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useListApiKeysQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation } from '../../store/api/apiKeyApi';
import toast from 'react-hot-toast';

export function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read', 'write']);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, refetch } = useListApiKeysQuery();
  const [create, { isLoading: creating }] = useCreateApiKeyMutation();
  const [revoke, { isLoading: revoking }] = useRevokeApiKeyMutation();
  const [pendingRevoke, setPendingRevoke] = useState<{ id: string; name: string } | null>(null);

  const activeKeys = data?.keys.filter(k => !k.revoked_at) ?? [];

  const handleCreate = async () => {
    try {
      const result = await create({ name, permissions }).unwrap();
      setNewKey(result.raw_key);
      setName('');
      setCreateOpen(false);
      toast.success('API key created');
    } catch {
      toast.error('Failed to create API key');
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      await revoke(pendingRevoke.id).unwrap();
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke key');
    } finally {
      setPendingRevoke(null);
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="API Keys" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">API Keys</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Manage keys to authenticate your application with FUGU.</p>
          </div>
          <Button variant="brand" onClick={() => setCreateOpen(true)} className="self-start sm:self-auto">
            <Plus size={16} /> Create key
          </Button>
        </div>

        {isLoading && <SkeletonLoader lines={4} />}

        {!isLoading && isError && (
          <ErrorState title="Couldn't load API keys" description="Something went wrong while fetching your API keys." onRetry={refetch} />
        )}

        {!isLoading && !isError && activeKeys.length === 0 && (
          <EmptyState
            icon={Key}
            title="No API keys yet"
            description="Create an API key to connect your application to FUGU's routing engine."
            action={
              <Button variant="brand" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> Create API key
              </Button>
            }
          />
        )}

        {!isLoading && !isError && activeKeys.length > 0 && (
          <Card padding="sm">
            <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Name</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Key</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Permissions</th>
                  <th className="hidden md:table-cell pb-3 px-4 text-label-caps text-on-surface-variant font-code">Last used</th>
                  <th className="hidden lg:table-cell pb-3 px-4 text-label-caps text-on-surface-variant font-code">Created</th>
                  <th className="pb-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {activeKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-surface-container-low">
                    <td className="py-3.5 px-4 font-medium text-on-surface max-w-[140px] truncate">{key.name}</td>
                    <td className="py-3.5 px-4 font-code text-on-surface-variant whitespace-nowrap">{key.key_prefix}••••••••</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={key.permissions.includes('write') ? 'full-access' : 'read-only'}>
                        {key.permissions.includes('write') ? 'Full access' : 'Read only'}
                      </Badge>
                    </td>
                    <td className="hidden md:table-cell py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="hidden lg:table-cell py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Button variant="destructive" size="sm" onClick={() => setPendingRevoke({ id: key.id, name: key.name })}>
                        <Trash2 size={13} /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API Key" size="sm">
        <div className="space-y-4">
          <Input
            label="Key name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production App"
          />
          <div>
            <p className="text-body-sm font-medium text-on-surface mb-2">Permissions</p>
            <div className="flex gap-2">
              {['read', 'write'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPermissions(permissions.includes(p) ? permissions.filter(x => x !== p) : [...permissions, p])}
                  aria-pressed={permissions.includes(p)}
                  className={`px-3 py-1.5 rounded-lg text-body-sm border transition-colors ${permissions.includes(p) ? 'bg-secondary-container text-white border-secondary-container' : 'border-outline-variant text-on-surface-variant hover:border-secondary'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="brand" className="flex-1 justify-center" loading={creating} onClick={handleCreate} disabled={!name}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reveal key modal */}
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Save your API key" size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-body-sm">
            <Eye size={16} className="mt-0.5 shrink-0" />
            <span>This key will only be shown once. Store it securely — you cannot view it again.</span>
          </div>
          <div className="relative">
            <div className="font-code text-body-sm bg-surface-container p-3 rounded-lg break-all pr-10">{newKey}</div>
            <button onClick={copyKey} aria-label="Copy API key" className="absolute right-2 top-2 p-1.5 hover:bg-surface-container-high rounded">
              {copied ? <Check size={14} className="text-success-green" /> : <Copy size={14} className="text-on-surface-variant" />}
            </button>
          </div>
          <Button variant="brand" className="w-full justify-center" onClick={() => setNewKey(null)}>
            Done
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingRevoke}
        title="Revoke API key"
        description={`Revoke "${pendingRevoke?.name}"? This cannot be undone.`}
        confirmLabel="Revoke"
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </div>
  );
}
