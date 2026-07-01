import { useState } from 'react';
import { Plus, Key, Copy, Check, Trash2, Eye } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useListApiKeysQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation } from '../../store/api/apiKeyApi';
import toast from 'react-hot-toast';

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-accent-violet/10 flex items-center justify-center mb-4">
        <Key size={28} className="text-accent-violet" />
      </div>
      <h2 className="text-headline-md font-headline font-bold text-on-surface mb-2">No API keys yet</h2>
      <p className="text-body-md text-on-surface-variant mb-6 max-w-sm">
        Create an API key to connect your application to FUGU's routing engine.
      </p>
      <Button variant="brand" onClick={onCreate}>
        <Plus size={16} /> Create API key
      </Button>
    </div>
  );
}

export function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read', 'write']);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useListApiKeysQuery();
  const [create, { isLoading: creating }] = useCreateApiKeyMutation();
  const [revoke] = useRevokeApiKeyMutation();

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

  const handleRevoke = async (id: string, keyName: string) => {
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    await revoke(id).unwrap().catch(() => toast.error('Failed to revoke key'));
    toast.success('API key revoked');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">API Keys</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Manage keys to authenticate your application with FUGU.</p>
          </div>
          <Button variant="brand" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Create key
          </Button>
        </div>

        {isLoading && <SkeletonLoader lines={4} />}

        {!isLoading && activeKeys.length === 0 && <EmptyState onCreate={() => setCreateOpen(true)} />}

        {!isLoading && activeKeys.length > 0 && (
          <Card padding="sm">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Name</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Key</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Permissions</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Last used</th>
                  <th className="pb-3 px-4 text-label-caps text-on-surface-variant font-code">Created</th>
                  <th className="pb-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {activeKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-surface-container-low">
                    <td className="py-3.5 px-4 font-medium text-on-surface">{key.name}</td>
                    <td className="py-3.5 px-4 font-code text-on-surface-variant">{key.key_prefix}••••••••</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={key.permissions.includes('write') ? 'full-access' : 'read-only'}>
                        {key.permissions.includes('write') ? 'Full access' : 'Read only'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <Button variant="destructive" size="sm" onClick={() => handleRevoke(key.id, key.name)}>
                        <Trash2 size={13} /> Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <button onClick={copyKey} className="absolute right-2 top-2 p-1.5 hover:bg-surface-container-high rounded">
              {copied ? <Check size={14} className="text-success-green" /> : <Copy size={14} className="text-on-surface-variant" />}
            </button>
          </div>
          <Button variant="brand" className="w-full justify-center" onClick={() => setNewKey(null)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
