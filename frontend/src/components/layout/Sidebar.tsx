import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Key, FileText, Search, CreditCard, Users,
  Webhook, ScrollText, Bell, Settings, Shield, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, Zap, type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../../store/uiSlice';
import type { RootState } from '../../store';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'API Keys', icon: Key, to: '/dashboard/api-keys' },
  { label: 'Documents', icon: FileText, to: '/dashboard/documents' },
  { label: 'Query Explorer', icon: Search, to: '/dashboard/queries' },
  { label: 'Tenant Isolation', icon: Shield, to: '/dashboard/tenant-isolation' },
];

const bottomNavItems = [
  { label: 'Usage & Billing', icon: CreditCard, to: '/dashboard/billing' },
  { label: 'Team', icon: Users, to: '/dashboard/team' },
  { label: 'Webhooks', icon: Webhook, to: '/dashboard/webhooks' },
  { label: 'Audit Logs', icon: ScrollText, to: '/dashboard/audit-logs' },
  { label: 'Notifications', icon: Bell, to: '/dashboard/notifications' },
  { label: 'Settings', icon: Settings, to: '/dashboard/settings' },
  { label: 'Security', icon: Shield, to: '/dashboard/security-settings' },
  { label: 'Support', icon: HelpCircle, to: '/dashboard/support' },
];

interface NavItemProps {
  label: string;
  icon: LucideIcon;
  to: string;
  collapsed: boolean;
}

function NavItem({ label, icon: Icon, to, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 text-body-sm font-body',
          isActive
            ? 'text-primary font-semibold bg-surface-container-low border-l-2 border-secondary -ml-0.5 pl-[13px]'
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
        )
      }
    >
      <Icon size={16} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const dispatch = useDispatch();
  const collapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const { logout, user } = useAuth();

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-primary-container border-r border-border-subtle transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border-subtle/20">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #7B2FF7 0%, #3FFFC0 100%)' }}
        >
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-headline-md font-headline text-on-primary font-bold">FUGU</span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 border-t border-border-subtle/20 space-y-1">
        {bottomNavItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </div>

      {/* User + collapse */}
      <div className="px-3 py-4 border-t border-border-subtle/20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-secondary-container text-white flex items-center justify-center text-body-sm font-bold shrink-0">
          {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-on-primary truncate">{user?.full_name}</p>
            <p className="text-[11px] text-on-primary-container truncate">{user?.email}</p>
          </div>
        )}
        <button onClick={logout} className="text-on-primary-container hover:text-on-primary p-1 rounded shrink-0" title="Log out">
          <LogOut size={15} />
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
