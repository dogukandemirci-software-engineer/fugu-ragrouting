import { Shield, Database, Lock } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';

export function TenantIsolationPage() {
  const { organizationId } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Tenant Isolation" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Tenant Isolation</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Your data is strictly isolated at the organization level.</p>
        </div>

        <Card>
          <div className="flex items-start gap-3 mb-4">
            <Shield size={20} className="text-accent-teal-glow mt-0.5" />
            <div>
              <h2 className="text-body-sm font-semibold text-on-surface">Organization isolation</h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                All data — documents, embeddings, query logs, and API keys — is scoped to your
                organization ID. No cross-tenant data access is possible at the database level.
              </p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3 font-code text-code-sm text-on-surface-variant">
            <span className="text-on-surface-variant/60">Organization ID:</span>{' '}
            <span className="text-on-surface">{organizationId ?? 'loading...'}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-start gap-3">
              <Database size={18} className="text-accent-violet mt-0.5" />
              <div>
                <h3 className="text-body-sm font-semibold text-on-surface mb-1">Row-level isolation</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Every database query is filtered by <code className="font-code">organization_id</code>.
                  Embeddings and graph nodes are tagged with your org ID and never shared.
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-accent-violet mt-0.5" />
              <div>
                <h3 className="text-body-sm font-semibold text-on-surface mb-1">Key scoping</h3>
                <p className="text-body-sm text-on-surface-variant">
                  API keys are bound to a single organization. A key cannot access data from
                  any other organization even if shared.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-body-sm font-semibold text-on-surface mb-1">Dedicated infrastructure</h3>
              <p className="text-body-sm text-on-surface-variant">
                Dedicated database cluster, VPC, and encryption keys per tenant.
              </p>
            </div>
            <Badge variant="neutral">Enterprise only</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
