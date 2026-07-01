import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand / Accent
        'accent-violet': '#7B2FF7',
        'accent-teal-glow': '#3FFFC0',
        'accent-magenta': '#FF2E9A',
        secondary: '#4a46d5',
        'secondary-container': '#6462ef',

        // Primary surfaces
        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#1c1b1b',
        'on-primary-container': '#858383',
        'primary-fixed': '#e5e2e1',
        'primary-fixed-dim': '#c9c6c5',
        'on-primary-fixed': '#1c1b1b',
        'on-primary-fixed-variant': '#474646',
        'inverse-primary': '#c9c6c5',

        // Background / Surface
        background: '#fbf8ff',
        'background-alt': '#FAFAFA',
        surface: '#fbf8ff',
        'surface-bright': '#fbf8ff',
        'surface-dim': '#dad9e4',
        'surface-variant': '#e3e1ec',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f2fd',
        'surface-container': '#efecf8',
        'surface-container-high': '#e9e7f2',
        'surface-container-highest': '#e3e1ec',
        'surface-tint': '#5f5e5e',
        'inverse-surface': '#2f3038',

        // On-Surface / Text
        'on-surface': '#1a1b23',
        'on-surface-variant': '#444748',
        'on-background': '#1a1b23',
        'inverse-on-surface': '#f1effa',

        // Secondary / Indigo
        'on-secondary': '#ffffff',
        'secondary-fixed': '#e2dfff',
        'secondary-fixed-dim': '#c2c1ff',
        'on-secondary-fixed': '#0c006a',
        'on-secondary-fixed-variant': '#332bbf',
        'on-secondary-container': '#fffbff',

        // Tertiary / Neutral
        tertiary: '#000000',
        'tertiary-container': '#1d1b1a',
        'tertiary-fixed': '#e6e1df',
        'tertiary-fixed-dim': '#cac6c3',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#868381',
        'on-tertiary-fixed': '#1d1b1a',
        'on-tertiary-fixed-variant': '#484645',

        // Borders
        'border-subtle': '#18181B',
        outline: '#747878',
        'outline-variant': '#c4c7c7',

        // Error / Semantic
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        // Status
        'success-green': '#059669',
        'success-green-bg': '#ECFDF5',
        'destructive-red': '#DC2626',
      },

      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Geist', 'Inter', 'sans-serif'],
        code: ['"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        'headline-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'code-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'code-sm': ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
      },

      spacing: {
        unit: '8px',
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '48px',
      },

      maxWidth: {
        content: '1440px',
      },

      borderRadius: {
        DEFAULT: '4px',
        md: '8px',
        card: '10px',
        xl: '12px',
      },

      boxShadow: {
        'accent-sm': '0 4px 20px -2px rgba(123, 47, 247, 0.15)',
        'accent-md': '0 4px 10px -2px rgba(123, 47, 247, 0.15)',
        'accent-glow': '0 0 15px rgba(123, 47, 247, 0.25)',
        'accent-glow-strong': '0 0 15px rgba(123, 47, 247, 0.4)',
        'teal-glow': '0 0 15px rgba(63, 255, 192, 0.3)',
        'green-dot': '0 0 8px rgba(34, 197, 94, 0.6)',
        'progress-glow': '0 0 15px rgba(123,47,247,0.3)',
      },

      backgroundImage: {
        'brand-primary': 'linear-gradient(135deg, #7B2FF7 0%, #2A1FB8 50%, #FF2E9A 100%)',
        'brand-indigo': 'linear-gradient(135deg, #7B2FF7 0%, #2A1FB8 100%)',
        'brand-teal': 'linear-gradient(135deg, #7B2FF7 0%, #3FFFC0 100%)',
        'brand-text': 'linear-gradient(135deg, #7B2FF7, #3FFFC0, #FF2E9A)',
        'ambient-glow': 'linear-gradient(to top right, rgba(123,47,247,0.1), rgba(255,46,154,0.05), rgba(63,255,192,0.1))',
      },
    },
  },
  plugins: [],
};

export default config;
