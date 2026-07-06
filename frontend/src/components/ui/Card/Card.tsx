import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  accent?: boolean;   // true → shows left accent gradient border
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean; // true → subtle lift + shadow on hover, for clickable cards
}

export function Card({ className, children, accent, padding = 'md', hoverable }: CardProps) {
  const paddings = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

  return (
    <div
      className={clsx(
        'bg-surface-container-lowest border border-outline-variant rounded-card',
        paddings[padding],
        accent && 'border-l-2 border-l-secondary',
        hoverable && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}
