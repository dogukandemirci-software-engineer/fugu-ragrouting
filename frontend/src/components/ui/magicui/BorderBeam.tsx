interface BorderBeamProps {
  className?: string;
}

export function BorderBeam({ className = '' }: BorderBeamProps) {
  return <span className={`border-beam pointer-events-none ${className}`} aria-hidden="true" />;
}
