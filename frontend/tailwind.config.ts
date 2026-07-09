import type { Config } from 'tailwindcss';
import { colors, gradients, shadows, borderRadius, fontFamily, fontSize, spacing } from './src/theme/tokens';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Single source of truth: src/theme/tokens.ts. Edit colors there —
      // every bg-*/text-*/border-* class here updates automatically.
      colors,

      fontFamily: {
        headline: fontFamily.headline,
        body: fontFamily.body,
        code: fontFamily.code,
      },

      fontSize,

      spacing: {
        unit: spacing.unit,
        gutter: spacing.gutter,
        'margin-mobile': spacing['margin-mobile'],
        'margin-desktop': spacing['margin-desktop'],
      },

      maxWidth: {
        content: spacing['max-width'],
      },

      borderRadius: {
        DEFAULT: borderRadius.DEFAULT,
        md: borderRadius.md,
        card: borderRadius.card,
        xl: borderRadius.xl,
      },

      boxShadow: shadows,

      backgroundImage: {
        'brand-primary': gradients['brand-primary'],
        'brand-indigo': gradients['brand-indigo'],
        'brand-teal': gradients['brand-teal'],
        'brand-text': gradients['brand-text'],
        'ambient-glow': gradients['ambient-glow'],
      },

      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // MagicUI components (meteors, orbiting-circles, marquee) — see
        // frontend/src/components/magicui/*.tsx for the adapted sources.
        meteor: {
          '0%': { transform: 'rotate(var(--angle)) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(var(--angle)) translateX(-500px)', opacity: '0' },
        },
        orbit: {
          '0%': {
            transform:
              'rotate(calc(var(--angle) * 1deg)) translateY(calc(var(--radius) * 1px)) rotate(calc(var(--angle) * -1deg))',
          },
          '100%': {
            transform:
              'rotate(calc(var(--angle) * 1deg + 360deg)) translateY(calc(var(--radius) * 1px)) rotate(calc((var(--angle) * -1deg) - 360deg))',
          },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(calc(-100% - var(--gap)))' },
        },
        'marquee-vertical': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(calc(-100% - var(--gap)))' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'reveal-up': 'reveal-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        meteor: 'meteor 5s linear infinite',
        orbit: 'orbit calc(var(--duration)*1s) linear infinite',
        marquee: 'marquee var(--duration) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
