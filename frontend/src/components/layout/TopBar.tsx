import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface-container-lowest border-b border-outline-variant shrink-0">
      {title && <h1 className="text-headline-md font-headline text-on-surface">{title}</h1>}
      <div className="flex items-center gap-3 ml-auto">
        <Link to="/dashboard/notifications" className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors">
          <Bell size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-secondary-container text-white flex items-center justify-center text-body-sm font-bold">
          {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}
