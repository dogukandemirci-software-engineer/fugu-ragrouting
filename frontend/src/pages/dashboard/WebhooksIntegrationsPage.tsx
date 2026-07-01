import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useListWebhooksQuery, useCreateWebhookMutation, useDeleteWebhookMutation } from '../../store/api/webhookApi';
import toast from 'react-hot-toast';

const EVENTS = ['query.completed', 'document.ingested', 'document.failed', 'api_key.created', 'api_key.revoked', 'subscription.changed', 'team.member_added'];

export function WebhooksIntegrationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [rawSecret, setRawSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] });

  const { data, isLoading } = useListWebhooksQuery();
  const [create, { isLoading: creating }] = useCreateWebhookMutation();
  const [del] = useDeleteWebhookMutation();

  const handleCreate = async () => {
    try {
      const result = await create(form).unwrap();
      setRawSecret(result.raw_secret);
      setCreateOpen(false);
      setForm({ name: '', url: '', events: [] });
    } catch {
      toast.error('Failed to create webhook');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Webhooks & Integrations" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg font-headline font-bold text-on-surface">Webhooks</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Receive real-time event notifications to your endpoints.</p>
          </div>
          <Button variant="brand" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Add webhook
          </Button>
        </div>

        {isLoading && <SkeletonLoader lines={4} />}

        {!isLoading && (data?.webhooks.length ?? 0) === 0 && (
          <div className="text-center py-16">
            <p className="text-body-md text-on-surface-variant">No webhooks yet. Add one to start receiving events.</p>
          </div>
        )}

        {!isLoading && (data?.webhooks ?? []).length > 0 && (
          <div className="space-y-3">
            {data!.webhooks.map((wh) => (
              <Card key={wh.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-body-sm font-medium text-on-surface">{wh.name}</h3>
                      <Badge variant={wh.active ? 'success' : 'neutral'}>{wh.active ? 'Active' : 'Inactive'}</Badge>
                      {wh.failure_count > 0 && <Badge variant="error">{wh.failure_count} failures</Badge>}
                    </div>
                    <p className="text-body-sm text-on-surface-variant font-code truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wh.events.map(e => <Badge key={e} variant="neutral">{e}</Badge>)}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={async () => { await del(wh.id); toast.success('Webhook deleted'); }}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add webhook" size="md">
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My webhook" />
          <Input label="URL" type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://your-server.com/webhook" />
          <div>
            <p className="text-body-sm font-medium text-on-surface mb-2">Events</p>
            <div className="grid grid-cols-2 gap-2">
              {EVENTS.map(e => (
                <label key={e} className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.events.includes(e)}
                    onChange={() => setForm(f => ({ ...f, events: f.events.includes(e) ? f.events.filter(x => x !== e) : [...f.events, e] }))}
                    className="accent-accent-violet"
                  />
                  {e}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="brand" className="flex-1 justify-center" loading={creating} onClick={handleCreate} disabled={!form.name || !form.url || form.events.length === 0}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Secret reveal modal */}
      <Modal open={!!rawSecret} onClose={() => setRawSecret(null)} title="Webhook secret" size="sm">
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">Use this secret to verify webhook signatures. It will only be shown once.</p>
          <div className="relative">
            <div className="font-code text-body-sm bg-surface-container p-3 rounded-lg break-all">
              {showSecret ? rawSecret : '••••••••••••••••••••••••••••••••'}
            </div>
            <button onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-2 p-1.5 hover:bg-surface-container-high rounded text-on-surface-variant">
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Button variant="brand" className="w-full justify-center" onClick={() => setRawSecret(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  );
}
