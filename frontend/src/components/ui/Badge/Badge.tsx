import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'full-access' | 'read-only' | 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  'full-access': 'bg-secondary-container text-white',
  'read-only': 'bg-surface-container-highest text-on-surface',
  'success': 'text-success-green',
  'error': 'bg-error-container text-on-error-container',
  'warning': 'bg-amber-100 text-amber-800',
  'info': 'bg-secondary-fixed text-on-secondary-fixed',
  'neutral': 'bg-surface-container-high text-on-surface-variant',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center text-label-caps font-code font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
        variant === 'success' && 'bg-success-green-bg',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
