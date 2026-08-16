import type { ReactNode } from 'react';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
}

export function MagicCard({ children, className = '' }: MagicCardProps) {
  return (
    <div className={`magic-card ${className}`}>
      <div className="magic-card-grid" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
