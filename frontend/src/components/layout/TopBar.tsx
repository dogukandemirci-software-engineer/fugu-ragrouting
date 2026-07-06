import { Bell, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toggleMobileSidebar } from '../../store/uiSlice';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();
  const dispatch = useDispatch();

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface border-b border-outline-variant shrink-0">
      <button
        onClick={() => dispatch(toggleMobileSidebar())}
        aria-label="Open navigation menu"
        className="md:hidden p-2 -ml-2 mr-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors shrink-0"
      >
        <Menu size={18} />
      </button>
      {title && <h1 className="text-body-lg font-semibold text-primary">{title}</h1>}
      <div className="hidden md:flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-md border border-outline-variant text-[11px] text-on-surface-variant">
        <kbd className="font-mono">⌘</kbd><kbd className="font-mono">K</kbd>
        <span className="ml-1">Quick jump</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <Link
          to="/dashboard/notifications"
          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-full transition-colors"
        >
          <Bell size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-body-sm font-bold text-primary">
          {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}
