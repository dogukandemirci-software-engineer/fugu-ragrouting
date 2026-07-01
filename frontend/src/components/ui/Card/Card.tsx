import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  accent?: boolean;   // true → shows left accent gradient border
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ className, children, accent, padding = 'md' }: CardProps) {
  const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

  return (
    <div
      className={clsx(
        'bg-surface-container-lowest border border-outline-variant rounded-card',
        paddings[padding],
        accent && 'border-l-2 border-l-secondary',
        className
      )}
    >
      {children}
    </div>
  );
}
