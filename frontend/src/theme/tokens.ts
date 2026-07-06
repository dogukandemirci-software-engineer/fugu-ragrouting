// ============================================================================
// FUGU DESIGN TOKENS — single source of truth for the whole app's palette.
//
// To re-theme the entire product, edit ONLY the hex values in `colors` below
// (and `gradients`/`shadows` if the brand hues change). `tailwind.config.ts`
// imports this file directly, so every `bg-background`, `text-on-surface`,
// `bg-brand-primary`, etc. utility class across the app updates automatically.
// Never hardcode a hex color or `rgba(...)` in a page/component — use the
// Tailwind class for the matching token instead (see README note at bottom).
// ============================================================================

export const colors = {
  // Brand / Accent — terracotta / gold / rust (warm, distinct from generic
  // violet-teal AI-startup palettes)
  'accent-violet': '#C15F3C',   // primary accent (terracotta) — key name kept for backward compat
  'accent-teal-glow': '#D4A24E', // secondary accent (warm gold)
  'accent-magenta': '#8B3A2B',   // tertiary accent (deep rust)
  secondary: '#5B4B3A',
  'secondary-container': '#7A6650',

  // Primary surfaces (dark ink — used for the auth side-panel, docs, sidebar dark accents)
  primary: '#1C1917',
  'on-primary': '#F7F3EC',
  'primary-container': '#292420',
  'on-primary-container': '#B8AFA3',
  'primary-fixed': '#EDE7DB',
  'primary-fixed-dim': '#D9D0C0',
  'on-primary-fixed': '#1C1917',
  'on-primary-fixed-variant': '#5A5248',
  'inverse-primary': '#D9D0C0',

  // Background / Surface hierarchy — warm paper/kraft
  background: '#F7F3EC',
  'background-alt': '#F2ECE0',
  surface: '#FBF9F4',
  'surface-bright': '#FFFFFF',
  'surface-dim': '#E8E1D3',
  'surface-variant': '#EDE6D8',
  'surface-container-lowest': '#FFFFFF',
  'surface-container-low': '#F5F0E6',
  'surface-container': '#EFE8DA',
  'surface-container-high': '#E9E1D0',
  'surface-container-highest': '#E2D9C6',
  'surface-tint': '#6B5D4B',
  'inverse-surface': '#292420',

  // On-Surface / Text
  'on-surface': '#1F1B16',
  'on-surface-variant': '#5C5348',
  'on-background': '#1F1B16',
  'inverse-on-surface': '#F2ECE0',

  // Secondary / warm neutral
  'on-secondary': '#ffffff',
  'secondary-fixed': '#EDE2D2',
  'secondary-fixed-dim': '#D4C4AC',
  'on-secondary-fixed': '#3A2E1F',
  'on-secondary-fixed-variant': '#5B4B3A',
  'on-secondary-container': '#FBF9F4',

  // Tertiary / deep ink (dark dashboard/marketing surfaces)
  tertiary: '#1C1917',
  'tertiary-container': '#292420',
  'tertiary-fixed': '#E6E1DF',
  'tertiary-fixed-dim': '#CAC6C3',
  'on-tertiary': '#F7F3EC',
  'on-tertiary-container': '#B8AFA3',
  'on-tertiary-fixed': '#1C1917',
  'on-tertiary-fixed-variant': '#484645',

  // Borders
  'border-subtle': '#E2D9C6',
  outline: '#8A7D6A',
  'outline-variant': '#DDD3C0',

  // Error / Semantic
  error: '#B3261E',
  'on-error': '#ffffff',
  'error-container': '#F9DEDC',
  'on-error-container': '#410E0B',

  // Status
  'success-green': '#3F6B3C',
  'success-green-bg': '#EBF3E8',
  'destructive-red': '#B3261E',

  // Dark-panel variants — for standalone dark surfaces (auth side panel, docs
  // page, privacy page) so those pages read from tokens too instead of raw hex.
  'ink-dark': '#1C1917',
  'ink-dark-hover': '#292420',
  'on-ink-dark': '#F7F3EC',
  'on-ink-dark-variant': 'rgba(247, 243, 236, 0.6)',
  'on-ink-dark-subtle': 'rgba(247, 243, 236, 0.4)',
  'ink-dark-border': 'rgba(247, 243, 236, 0.1)',
} as const;

export const gradients = {
  'brand-primary': 'linear-gradient(135deg, #C15F3C 0%, #9B4A30 50%, #8B3A2B 100%)',
  'brand-indigo': 'linear-gradient(135deg, #C15F3C 0%, #9B4A30 100%)',
  'brand-teal': 'linear-gradient(135deg, #C15F3C 0%, #D4A24E 100%)',
  'brand-text': 'linear-gradient(135deg, #C15F3C, #D4A24E, #8B3A2B)',
  'ambient-glow': 'linear-gradient(to top right, rgba(193,95,60,0.08), rgba(139,58,43,0.04), rgba(212,162,78,0.08))',
} as const;

export const shadows = {
  'accent-sm': '0 4px 20px -2px rgba(193, 95, 60, 0.15)',
  'accent-md': '0 4px 10px -2px rgba(193, 95, 60, 0.15)',
  'accent-glow': '0 0 15px rgba(193, 95, 60, 0.2)',
  'accent-glow-strong': '0 0 15px rgba(193, 95, 60, 0.35)',
  'teal-glow': '0 0 15px rgba(212, 162, 78, 0.25)',
  'green-dot': '0 0 8px rgba(63, 107, 60, 0.5)',
  'progress-glow': '0 0 15px rgba(193,95,60,0.25)',
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
  headline: ['Fraunces', 'Georgia', 'serif'],
  body: ['Inter', 'sans-serif'],
  code: ['JetBrains Mono', 'monospace'],
} as const;

export const fontSize = {
  'headline-xl': ['52px', { lineHeight: '58px', letterSpacing: '-0.02em', fontWeight: '600' }],
  'headline-lg': ['34px', { lineHeight: '42px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'headline-md': ['25px', { lineHeight: '33px', fontWeight: '600' }],
  'body-lg': ['19px', { lineHeight: '29px', fontWeight: '400' }],
  'body-md': ['16px', { lineHeight: '25px', fontWeight: '400' }],
  'body-sm': ['14px', { lineHeight: '21px', fontWeight: '400' }],
  'code-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
  'code-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
  'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
} as const;

export const spacing = {
  unit: '8px',
  gutter: '24px',
  'margin-mobile': '16px',
  'margin-desktop': '48px',
  'max-width': '1440px',
} as const;
