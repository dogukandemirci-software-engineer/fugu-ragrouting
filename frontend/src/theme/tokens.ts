// ============================================================================
// FUGU DESIGN TOKENS — monochrome product system.
// Every visual surface in the application is driven by this black-and-white
// palette so components never fall back to the previous warm brand colors.
// ============================================================================

export const colors = {
  'accent-violet': '#000000',
  'accent-teal-glow': '#666666',
  'accent-magenta': '#222222',
  secondary: '#333333',
  'secondary-container': '#E5E5E5',

  primary: '#000000',
  'on-primary': '#FFFFFF',
  'primary-container': '#171717',
  'on-primary-container': '#E5E5E5',
  'primary-fixed': '#E5E5E5',
  'primary-fixed-dim': '#CCCCCC',
  'on-primary-fixed': '#000000',
  'on-primary-fixed-variant': '#444444',
  'inverse-primary': '#FFFFFF',

  background: '#FFFFFF',
  'background-alt': '#FAFAFA',
  surface: '#FFFFFF',
  'surface-bright': '#FFFFFF',
  'surface-dim': '#E5E5E5',
  'surface-variant': '#F0F0F0',
  'surface-container-lowest': '#FFFFFF',
  'surface-container-low': '#FAFAFA',
  'surface-container': '#F5F5F5',
  'surface-container-high': '#EEEEEE',
  'surface-container-highest': '#E5E5E5',
  'surface-tint': '#666666',
  'inverse-surface': '#111111',

  'on-surface': '#0A0A0A',
  'on-surface-variant': '#666666',
  'on-background': '#0A0A0A',
  'inverse-on-surface': '#F5F5F5',

  'on-secondary': '#FFFFFF',
  'secondary-fixed': '#E5E5E5',
  'secondary-fixed-dim': '#CCCCCC',
  'on-secondary-fixed': '#111111',
  'on-secondary-fixed-variant': '#444444',
  'on-secondary-container': '#111111',

  tertiary: '#111111',
  'tertiary-container': '#222222',
  'tertiary-fixed': '#E5E5E5',
  'tertiary-fixed-dim': '#CCCCCC',
  'on-tertiary': '#FFFFFF',
  'on-tertiary-container': '#E5E5E5',
  'on-tertiary-fixed': '#111111',
  'on-tertiary-fixed-variant': '#444444',

  'border-subtle': '#E5E5E5',
  outline: '#777777',
  'outline-variant': '#D4D4D4',

  error: '#111111',
  'on-error': '#FFFFFF',
  'error-container': '#E5E5E5',
  'on-error-container': '#111111',

  'success-green': '#333333',
  'success-green-bg': '#E5E5E5',
  'destructive-red': '#111111',

  'ink-dark': '#050505',
  'ink-dark-hover': '#171717',
  'on-ink-dark': '#FFFFFF',
  'on-ink-dark-variant': 'rgba(255, 255, 255, 0.64)',
  'on-ink-dark-subtle': 'rgba(255, 255, 255, 0.42)',
  'ink-dark-border': 'rgba(255, 255, 255, 0.16)',
} as const;

export const gradients = {
  'brand-primary': 'linear-gradient(135deg, #050505 0%, #333333 50%, #000000 100%)',
  'brand-indigo': 'linear-gradient(135deg, #000000 0%, #333333 100%)',
  'brand-teal': 'linear-gradient(135deg, #111111 0%, #666666 100%)',
  'brand-text': 'linear-gradient(135deg, #000000, #666666, #111111)',
  'ambient-glow': 'linear-gradient(to top right, rgba(0,0,0,0.08), rgba(100,100,100,0.04), rgba(0,0,0,0.08))',
} as const;

export const shadows = {
  'accent-sm': '0 4px 20px -2px rgba(0, 0, 0, 0.12)',
  'accent-md': '0 4px 10px -2px rgba(0, 0, 0, 0.14)',
  'accent-glow': '0 0 15px rgba(0, 0, 0, 0.18)',
  'accent-glow-strong': '0 0 22px rgba(0, 0, 0, 0.28)',
  'teal-glow': '0 0 15px rgba(0, 0, 0, 0.18)',
  'green-dot': '0 0 8px rgba(0, 0, 0, 0.3)',
  'progress-glow': '0 0 15px rgba(0, 0, 0, 0.22)',
} as const;

export const borderRadius = {
  sm: '6px',
  DEFAULT: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  card: '16px',
  full: '9999px',
} as const;

export const fontFamily = {
  headline: ['IBM Plex Sans', 'sans-serif'],
  body: ['IBM Plex Sans', 'sans-serif'],
  code: ['JetBrains Mono', 'monospace'],
} as const;

export const fontSize = {
  'headline-xl': ['52px', { lineHeight: '58px', letterSpacing: '-0.04em', fontWeight: '600' }],
  'headline-lg': ['34px', { lineHeight: '42px', letterSpacing: '-0.03em', fontWeight: '600' }],
  'headline-md': ['25px', { lineHeight: '33px', fontWeight: '600' }],
  'body-lg': ['19px', { lineHeight: '29px', fontWeight: '400' }],
  'body-md': ['16px', { lineHeight: '25px', fontWeight: '400' }],
  'body-sm': ['14px', { lineHeight: '21px', fontWeight: '400' }],
  'code-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
  'code-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
  'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
} as const;

export const spacing = {
  unit: '8px',
  gutter: '24px',
  'margin-mobile': '16px',
  'margin-desktop': '48px',
  'max-width': '1440px',
} as const;
