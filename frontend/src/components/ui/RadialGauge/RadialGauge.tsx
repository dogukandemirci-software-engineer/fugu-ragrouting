import { useEffect, useState } from 'react';

interface RadialGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  danger?: boolean;
}

const GRADIENT_ID = 'radial-gauge-brand-gradient';

// Circular progress gauge — animates its arc in on mount instead of a
// flat bar snapping to width. Uses the brand terracotta→gold gradient
// (falls back to a flat error red past the danger threshold).
export function RadialGauge({ percent, size = 96, strokeWidth = 8, label, sublabel, danger }: RadialGaugeProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (clamped / 100) * circumference;
    const raf = requestAnimationFrame(() => setAnimatedOffset(target));
    return () => cancelAnimationFrame(raf);
  }, [clamped, circumference]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C15F3C" />
            <stop offset="100%" stopColor="#D4A24E" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-container-high"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={danger ? '#B3261E' : `url(#${GRADIENT_ID})`}
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-headline font-semibold text-on-surface leading-none"
          style={{ fontSize: size < 72 ? '13px' : '20px' }}
        >
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel && <span className="text-[10px] text-on-surface-variant mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
