import { Lock, Shield } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export function SecuritySettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Security Settings" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-2xl">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Security Settings</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage security and access controls for your organization.</p>
        </div>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-accent-violet mt-0.5 shrink-0" />
              <div>
                <h3 className="text-body-sm font-semibold text-on-surface">Two-factor authentication</h3>
                <p className="text-body-sm text-on-surface-variant mt-0.5">Require 2FA for all team members</p>
              </div>
            </div>
            <Badge variant="neutral" className="self-start sm:self-auto shrink-0">Not yet available</Badge>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-accent-violet mt-0.5 shrink-0" />
              <div>
                <h3 className="text-body-sm font-semibold text-on-surface">SSO / SAML</h3>
                <p className="text-body-sm text-on-surface-variant mt-0.5">Single sign-on with your identity provider</p>
              </div>
            </div>
            <Badge variant="neutral" className="self-start sm:self-auto shrink-0">Enterprise only</Badge>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-accent-teal-glow mt-0.5" />
            <div>
              <h3 className="text-body-sm font-semibold text-on-surface mb-1">API key security</h3>
              <p className="text-body-sm text-on-surface-variant">
                All API keys are stored as bcrypt hashes. Raw keys are shown only once at creation.
                Keys can be revoked instantly from the API Keys page.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
