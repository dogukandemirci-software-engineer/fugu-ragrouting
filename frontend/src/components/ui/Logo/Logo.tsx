import { colors } from '../../../theme/tokens';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

// FUGU's mark: one query forking into three routing paths (vector / graph /
// hybrid) — distinct from generic lightning-bolt "AI" iconography. Reads its
// fill/stroke from theme/tokens.ts (SVG attrs can't take Tailwind classes)
// so it re-themes along with the rest of the app.
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const ink = colors['ink-dark'];
  const gold = colors['accent-teal-glow'];
  const terracotta = colors['accent-violet'];

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill={ink} />
      <path d="M16 6 L16 15" stroke={gold} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 15 L8 25" stroke={terracotta} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 15 L24 25" stroke={terracotta} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="6" r="3" fill={gold} />
      <circle cx="8" cy="26" r="2.5" fill={terracotta} />
      <circle cx="24" cy="26" r="2.5" fill={terracotta} />
    </svg>
  );
}
