// Design tokens extracted from Stitch HTML sources (Phase 0)
// Source of truth: frontend/theme/*/code.html

export const colors = {
  // Brand / Accent
  accentViolet: '#7B2FF7',
  accentTealGlow: '#3FFFC0',
  accentMagenta: '#FF2E9A',
  secondary: '#4a46d5',
  secondaryContainer: '#6462ef',

  // Primary / Surface
  primary: '#000000',
  onPrimary: '#ffffff',
  primaryContainer: '#1c1b1b',
  onPrimaryContainer: '#858383',
  primaryFixed: '#e5e2e1',
  primaryFixedDim: '#c9c6c5',
  onPrimaryFixed: '#1c1b1b',
  onPrimaryFixedVariant: '#474646',
  inversePrimary: '#c9c6c5',

  // Background / Surface hierarchy
  background: '#fbf8ff',
  backgroundAlt: '#FAFAFA',
  surface: '#fbf8ff',
  surfaceBright: '#fbf8ff',
  surfaceDim: '#dad9e4',
  surfaceVariant: '#e3e1ec',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f4f2fd',
  surfaceContainer: '#efecf8',
  surfaceContainerHigh: '#e9e7f2',
  surfaceContainerHighest: '#e3e1ec',
  surfaceTint: '#5f5e5e',
  inverseSurface: '#2f3038',

  // On-Surface / Text
  onSurface: '#1a1b23',
  onSurfaceVariant: '#444748',
  onBackground: '#1a1b23',
  inverseOnSurface: '#f1effa',

  // Secondary / Indigo
  onSecondary: '#ffffff',
  secondaryFixed: '#e2dfff',
  secondaryFixedDim: '#c2c1ff',
  onSecondaryFixed: '#0c006a',
  onSecondaryFixedVariant: '#332bbf',
  onSecondaryContainer: '#fffbff',

  // Tertiary / Neutral
  tertiary: '#000000',
  tertiaryContainer: '#1d1b1a',
  tertiaryFixed: '#e6e1df',
  tertiaryFixedDim: '#cac6c3',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#868381',
  onTertiaryFixed: '#1d1b1a',
  onTertiaryFixedVariant: '#484645',

  // Borders
  borderSubtle: '#18181B',
  outline: '#747878',
  outlineVariant: '#c4c7c7',

  // Error / Semantic
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Status (not in token palette, used as inline values)
  successGreen: '#059669',
  successGreenBg: '#ECFDF5',
  destructiveRed: '#DC2626',
} as const;

export const gradients = {
  // Three-stop brand gradient: violet → indigo → magenta
  brandPrimary: 'linear-gradient(135deg, #7B2FF7 0%, #2A1FB8 50%, #FF2E9A 100%)',
  // Two-stop: violet → indigo (simpler CTA variant)
  brandIndigo: 'linear-gradient(135deg, #7B2FF7 0%, #2A1FB8 100%)',
  // Two-stop: violet → teal (logo, charts, progress)
  brandTeal: 'linear-gradient(135deg, #7B2FF7 0%, #3FFFC0 100%)',
  // Three-stop gradient text: violet → teal → magenta
  brandText: 'linear-gradient(135deg, #7B2FF7, #3FFFC0, #FF2E9A)',
  // Ambient background glow
  ambientGlow: 'linear-gradient(to top right, rgba(123,47,247,0.1), rgba(255,46,154,0.05), rgba(63,255,192,0.1))',
} as const;

export const shadows = {
  accentSm: '0 4px 20px -2px rgba(123, 47, 247, 0.15)',
  accentMd: '0 4px 10px -2px rgba(123, 47, 247, 0.15)',
  accentGlow: '0 0 15px rgba(123, 47, 247, 0.25)',
  accentGlowStrong: '0 0 15px rgba(123, 47, 247, 0.4)',
  tealGlow: '0 0 15px rgba(63, 255, 192, 0.3)',
  greenDot: '0 0 8px rgba(34, 197, 94, 0.6)',
  progressGlow: '0 0 15px rgba(123,47,247,0.3)',
} as const;

export const borderRadius = {
  sm: '4px',
  DEFAULT: '4px',
  md: '8px',
  lg: '8px',
  xl: '12px',
  card: '10px',
  full: '9999px',
} as const;

export const fontFamily = {
  headline: ['Inter', 'sans-serif'],
  body: ['Geist', 'Inter', 'sans-serif'],
  code: ['JetBrains Mono', 'monospace'],
} as const;

export const fontSize = {
  headlineXl: ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
  headlineLg: ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
  headlineMd: ['24px', { lineHeight: '32px', fontWeight: '600' }],
  bodyLg: ['18px', { lineHeight: '28px', fontWeight: '400' }],
  bodyMd: ['16px', { lineHeight: '24px', fontWeight: '400' }],
  bodySm: ['14px', { lineHeight: '20px', fontWeight: '400' }],
  codeMd: ['14px', { lineHeight: '22px', fontWeight: '400' }],
  codeSm: ['12px', { lineHeight: '18px', fontWeight: '400' }],
  labelCaps: ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
} as const;

export const spacing = {
  unit: '8px',
  gutter: '24px',
  marginMobile: '16px',
  marginDesktop: '48px',
  maxWidth: '1440px',
} as const;
