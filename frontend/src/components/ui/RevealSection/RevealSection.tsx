import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { useScrollReveal } from '../../../hooks/useScrollReveal';

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'footer';
  delayMs?: number;
}

// Wraps a landing-page section so it fades/slides in the first time it
// scrolls into view — a subtle cue that rewards scrolling instead of dumping
// the whole page statically. Pairs with .reveal-on-scroll in globals.css.
export function RevealSection({ children, className, as: Tag = 'section', delayMs = 0 }: RevealSectionProps) {
  const ref = useScrollReveal<HTMLElement>();

  return (
    <Tag
      ref={ref as never}
      className={clsx('reveal-on-scroll', className)}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
