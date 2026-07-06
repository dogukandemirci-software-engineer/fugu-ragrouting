import { useEffect, useRef } from 'react';

// Adds `.is-visible` (see `.reveal-on-scroll` in globals.css) the first time
// the element scrolls into view, then stops observing — a one-shot reveal,
// not a replay-on-every-scroll effect.
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
