import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Key, FileText, Search, CreditCard, Users,
  Webhook, ScrollText, Bell, Settings, Shield, HelpCircle, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../../hooks/useAuth';

interface CommandItem {
  label: string;
  icon: LucideIcon;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const close = () => { setOpen(false); setQuery(''); };

  const go = (path: string) => { navigate(path); close(); };

  const items: CommandItem[] = useMemo(() => [
    { label: 'Dashboard', icon: LayoutDashboard, action: () => go('/dashboard') },
    { label: 'Documents', icon: FileText, action: () => go('/dashboard/documents') },
    { label: 'Query Explorer', icon: Search, action: () => go('/dashboard/queries') },
    { label: 'API Keys', icon: Key, action: () => go('/dashboard/api-keys') },
    { label: 'Tenant Isolation', icon: Shield, action: () => go('/dashboard/tenant-isolation') },
    { label: 'Usage & Billing', icon: CreditCard, action: () => go('/dashboard/billing') },
    { label: 'Team', icon: Users, action: () => go('/dashboard/team') },
    { label: 'Webhooks', icon: Webhook, action: () => go('/dashboard/webhooks') },
    { label: 'Audit Logs', icon: ScrollText, action: () => go('/dashboard/audit-logs') },
    { label: 'Notifications', icon: Bell, action: () => go('/dashboard/notifications') },
    { label: 'Settings', icon: Settings, action: () => go('/dashboard/settings') },
    { label: 'Security Settings', icon: Shield, action: () => go('/dashboard/security-settings') },
    { label: 'Support & Help', icon: HelpCircle, action: () => go('/dashboard/support') },
    { label: 'Sign out', icon: LogOut, action: () => { close(); void logout(); navigate('/log-in'); }, keywords: 'logout' },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate, dispatch]);

  const filtered = items.filter((item) =>
    `${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal open={open} onClose={close} size="sm" className="!p-0 overflow-hidden">
      <div className="p-0">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to..."
          className="w-full px-5 py-4 bg-transparent border-b border-outline-variant text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-5 py-6 text-body-sm text-on-surface-variant text-center">No matches</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left text-body-sm text-on-surface hover:bg-surface-container transition-colors"
            >
              <item.icon size={15} className="text-on-surface-variant shrink-0" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
