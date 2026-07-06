import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'brand' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-body-sm gap-1.5',
  md: 'px-4 py-2 text-body-sm gap-2',
  lg: 'px-6 py-3 text-body-md gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-body font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-accent-violet/40';

  const variants = {
    brand: 'btn-brand',
    secondary: 'bg-surface-container-lowest border border-border-subtle text-primary hover:bg-surface-container',
    destructive: 'border border-error text-error hover:bg-error hover:text-white',
    ghost: 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizeClasses[size], className)}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
