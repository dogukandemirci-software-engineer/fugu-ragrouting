import { useState } from 'react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');

  const handleSave = async () => {
    // TODO: implement profile update endpoint + RTK Query mutation
    toast.success('Settings saved');
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
            <Button variant="brand" onClick={handleSave}>Save changes</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-headline-md font-headline font-semibold text-on-surface mb-2">Danger zone</h2>
          <p className="text-body-sm text-on-surface-variant mb-4">
            Deleting your organization is permanent. All data will be scheduled for deletion after 30 days (GDPR compliance).
          </p>
          <Button variant="destructive" onClick={() => toast.error('Contact support to delete your organization')}>
            Delete organization
          </Button>
        </Card>
      </div>
    </div>
  );
}
