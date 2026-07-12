import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Key, FileText, Search, CreditCard, Users,
  Webhook, ScrollText, Bell, Settings, Shield, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, Home, type LucideIcon, Megaphone,
  Building2, Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { LogoMark } from '../ui/Logo';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, closeMobileSidebar } from '../../store/uiSlice';
import type { RootState } from '../../store';
import { useAuth } from '../../hooks/useAuth';
import { useListQueryLogsQuery } from '../../store/api/queryApi';
import { useListMyOrganizationsQuery, useSwitchOrgMutation } from '../../store/api/authApi';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Documents', icon: FileText, to: '/dashboard/documents' },
  { label: 'Query Explorer', icon: Search, to: '/dashboard/queries' },
  { label: 'API Keys', icon: Key, to: '/dashboard/api-keys' },
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

// Changelog entries — update these as new features ship
const CHANGELOG = [
  { version: 'v1.2.0', date: 'Jul 2025', text: 'OpenRouter & Cohere embedding support added' },
  { version: 'v1.1.0', date: 'Jul 2025', text: 'Apache AGE graph routing now available' },
  { version: 'v1.0.0', date: 'Jun 2025', text: 'PDF, DOCX, CSV, XLSX, JSON parsers shipped' },
];

interface NavItemProps {
  label: string;
  icon: LucideIcon;
  to: string;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}

function NavItem({ label, icon: Icon, to, collapsed, badge, onNavigate }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 py-2 rounded-md transition-all duration-150 text-body-sm font-body relative',
          collapsed ? 'px-0 justify-center' : 'px-4',
          isActive
            ? 'text-primary font-semibold border-l-2 border-secondary-container bg-surface-container-low'
            : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
        )
      }
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge && badge > 0 ? (
        <span className="ml-auto text-[10px] font-bold text-white bg-accent-violet rounded-full px-1.5 py-0.5 leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
      {collapsed && badge && badge > 0 ? (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent-violet" />
      ) : null}
    </NavLink>
  );
}

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const { organizationId } = useAuth();
  const { data } = useListMyOrganizationsQuery();
  const [switchOrg, { isLoading: switching }] = useSwitchOrgMutation();
  const orgs = data?.organizations ?? [];

  if (orgs.length < 2) return null;
  const current = orgs.find((o) => o.id === organizationId);

  const handleSwitch = async (orgId: string) => {
    if (orgId === organizationId) { setOpen(false); return; }
    try {
      await switchOrg(orgId).unwrap();
      window.location.reload();
    } catch {
      toast.error('Failed to switch organization');
      setOpen(false);
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        title={current?.name ?? 'Switch organization'}
        className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-md transition-colors"
      >
        <Building2 size={15} />
      </button>
    );
  }

  return (
    <div className="relative px-4 pt-3">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors text-left"
      >
        <Building2 size={14} className="text-on-surface-variant shrink-0" />
        <span className="flex-1 min-w-0 truncate text-body-sm font-medium text-primary">
          {current?.name ?? 'Select organization'}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-4 right-4 mt-1 z-20 rounded-md border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container-low transition-colors"
              >
                <span className="flex-1 min-w-0 truncate text-primary">{org.name}</span>
                {org.id === organizationId && <Check size={13} className="text-accent-violet shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const collapsed = useSelector((state: RootState) => state.ui.sidebarCollapsed);
  const mobileOpen = useSelector((state: RootState) => state.ui.mobileSidebarOpen);
  const { logout, user } = useAuth();
  const { data: queryLogs } = useListQueryLogsQuery({ limit: 5 });

  // Recent activity count (last 24h queries as "updates")
  const recentCount = queryLogs?.logs?.filter(l => {
    const age = Date.now() - new Date(l.created_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  }).length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/log-in');
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => dispatch(closeMobileSidebar())}
          aria-hidden="true"
        />
      )}
      <aside
        className={clsx(
          'flex flex-col h-screen bg-surface-container-lowest border-r border-outline-variant transition-all duration-200 shrink-0',
          // `fixed` and `relative` both set `position`, and Tailwind's
          // stylesheet defines `.relative` after `.fixed` — an unconditional
          // `relative` here would always win over `fixed` regardless of
          // breakpoint, permanently pulling the mobile sidebar back into
          // normal flow (visually translated off-screen, but still
          // reserving its full width and pushing the rest of the layout
          // right). Scope `relative` to md+ where `static` needs a
          // positioning context for the collapse-toggle button below.
          'fixed md:static md:relative inset-y-0 left-0 z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-14' : 'w-64'
        )}
      >
      {/* Logo + home link */}
      <div className={clsx('py-5 border-b border-outline-variant', collapsed ? 'px-0 flex justify-center' : 'px-4')}>
        <NavLink to="/dashboard" className={clsx('flex items-center group', !collapsed && 'gap-3')}>
          <LogoMark size={36} className="shrink-0 rounded-xl group-hover:opacity-90 transition-opacity" />
          {!collapsed && (
            <div>
              <div className="text-[17px] font-headline font-semibold text-primary leading-tight">FUGU</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                RAG Infrastructure
              </div>
            </div>
          )}
        </NavLink>
      </div>

      {/* Home shortcut */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1">
          <a
            href="/"
            className="flex items-center gap-2 text-[11px] text-on-surface-variant hover:text-primary transition-colors"
          >
            <Home size={12} />
            <span>Back to home</span>
          </a>
        </div>
      )}

      <OrgSwitcher collapsed={collapsed} />

      {/* Main nav */}
      <nav className={clsx('flex-1 overflow-y-auto py-3 space-y-0.5', collapsed ? 'px-2' : 'px-4')}>
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={collapsed}
            badge={item.to === '/dashboard/notifications' ? recentCount : undefined}
            onNavigate={() => dispatch(closeMobileSidebar())}
          />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-outline-variant" />

        {bottomNavItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={() => dispatch(closeMobileSidebar())} />
        ))}
      </nav>

      {/* Changelog / Updates strip */}
      {!collapsed && (
        <div className="mx-4 mb-3 rounded-[10px] border border-outline-variant bg-surface-container-low overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant bg-surface-container">
            <Megaphone size={12} className="text-accent-violet shrink-0" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">What's new</span>
          </div>
          <div className="divide-y divide-outline-variant">
            {CHANGELOG.slice(0, 2).map((entry) => (
              <div key={entry.version} className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold text-accent-violet font-mono">{entry.version}</span>
                  <span className="text-[10px] text-on-surface-variant">{entry.date}</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-snug">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User + logout */}
      <div className={clsx('py-3 border-t border-outline-variant', collapsed ? 'px-0' : 'px-4')}>
        <div className={clsx('flex items-center', collapsed ? 'flex-col gap-2' : 'gap-3')}>
          <div
            className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-[13px] font-bold shrink-0 text-primary"
            title={collapsed ? (user?.full_name ?? 'User') : undefined}
          >
            {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-primary truncate leading-tight">
                  {user?.full_name ?? 'User'}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">{user?.email ?? ''}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors shrink-0"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-container-lowest border border-outline-variant items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
      </aside>
    </>
  );
}
