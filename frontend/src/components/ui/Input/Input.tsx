import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightElement, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-on-surface mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-on-surface-variant pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            {...props}
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full px-3 py-2.5 text-body-sm font-body text-on-surface bg-surface-container-lowest',
              'border rounded-lg transition-all duration-150',
              'placeholder:text-on-surface-variant/60',
              'focus:outline-none focus:ring-2 focus:ring-accent-violet/30 focus:border-accent-violet',
              error ? 'border-error' : 'border-outline-variant hover:border-outline',
              leftIcon && 'pl-10',
              rightElement && 'pr-10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
          />
          {rightElement && (
            <div className="absolute right-3">{rightElement}</div>
          )}
        </div>
        {error && <p className="mt-1 text-body-sm text-error">{error}</p>}
        {hint && !error && <p className="mt-1 text-body-sm text-on-surface-variant">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
