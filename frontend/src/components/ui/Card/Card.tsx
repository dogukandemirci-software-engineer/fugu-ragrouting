import React from 'react';
import { clsx } from 'clsx';
import { MagicCard } from '../magicui/MagicCard';

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
    <MagicCard
      className={clsx(
        paddings[padding],
        accent && 'border-black',
        hoverable && 'transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl',
        className
      )}
    >
      {children}
    </MagicCard>
  );
}
