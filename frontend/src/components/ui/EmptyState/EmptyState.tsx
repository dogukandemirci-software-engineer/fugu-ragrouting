import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[10px] p-16 text-center">
      <div className="w-16 h-16 rounded-full bg-accent-violet/10 flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-accent-violet" />
      </div>
      <h3 className="text-body-md font-semibold text-primary mb-2">{title}</h3>
      <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}
