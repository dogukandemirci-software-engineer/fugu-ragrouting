import { ReactNode, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { motion, useScroll, useTransform, useReducedMotion, MotionStyle } from 'framer-motion';
import { useScrollReveal } from '../../../hooks/useScrollReveal';

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'footer';
  delayMs?: number;
  /** Opt-in: this section visibly rises up and slides over the section above
   * it as the user scrolls past — a layered "world coming up to meet you"
   * feel instead of the page just sliding down. Built on Motion's
   * scroll-linked useScroll/useTransform (hardware-accelerated where
   * supported) rather than a hand-rolled scroll listener. Respects
   * prefers-reduced-motion (falls back to a static layout). */
  parallax?: boolean;
}

const MotionTag = motion.section;

// Wraps a landing-page section so it fades/slides in the first time it
// scrolls into view — a subtle cue that rewards scrolling instead of dumping
// the whole page statically. Pairs with .reveal-on-scroll in globals.css.
export function RevealSection({ children, className, as: Tag = 'section', delayMs = 0, parallax = false }: RevealSectionProps) {
  const revealRef = useScrollReveal<HTMLElement>();
  const parallaxRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: parallaxRef,
    offset: ['start end', 'start start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [160, 0]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.15, 1], [0, 0.18, 0]);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      revealRef.current = node;
      if (parallax) parallaxRef.current = node;
    },
    [revealRef, parallax]
  );

  if (!parallax || prefersReducedMotion) {
    return (
      <Tag
        ref={setRefs as never}
        className={clsx('reveal-on-scroll', className)}
        style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
      >
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      ref={setRefs as never}
      className={clsx('reveal-on-scroll relative', className)}
      style={{
        y,
        boxShadow: useTransform(shadowOpacity, (o) => `0 -24px 48px -24px rgba(0,0,0,${o})`),
        ...(delayMs ? ({ animationDelay: `${delayMs}ms` } as MotionStyle) : undefined),
      }}
    >
      {children}
    </MotionTag>
  );
}
