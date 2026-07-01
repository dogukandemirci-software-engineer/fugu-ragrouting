---
name: Fugu Enterprise
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e4'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#efecf8'
  surface-container-high: '#e9e7f2'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b23'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#4a46d5'
  on-secondary: '#ffffff'
  secondary-container: '#6462ef'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b1a'
  on-tertiary-container: '#868381'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c2c1ff'
  on-secondary-fixed: '#0c006a'
  on-secondary-fixed-variant: '#332bbf'
  tertiary-fixed: '#e6e1df'
  tertiary-fixed-dim: '#cac6c3'
  on-tertiary-fixed: '#1d1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fbf8ff'
  on-background: '#1a1b23'
  surface-variant: '#e3e1ec'
  background-alt: '#FAFAFA'
  accent-violet: '#7B2FF7'
  accent-magenta: '#FF2E9A'
  accent-teal-glow: '#3FFFC0'
  border-subtle: '#18181B'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1440px
---

## Brand & Style

This design system is built for an enterprise-grade developer platform, prioritizing technical precision and high-performance routing. The aesthetic is **Corporate Modern** with a high-contrast, clean-white foundation, punctuated by a hyper-vibrant "electric-spectrum" accent. 

The brand personality is authoritative and reliable, yet suggests the cutting-edge speed of modern RAG (Retrieval-Augmented Generation) infrastructure. It draws inspiration from high-end technical documentation and developer tools, utilizing ample whitespace, crisp borders, and monospaced accents to communicate a "built for builders" philosophy. The visual narrative centers on the contrast between a stable, structural UI and the dynamic, multi-colored energy of data in motion.

## Colors

The color strategy relies on a sophisticated monochromatic base to ensure the technical data remains the focal point. The primary background is pure white (#FFFFFF), while #FAFAFA is used for secondary layout containers or sidebars to provide subtle structural depth.

**The Accent Gradient:**
The critical brand identifier is a 135° diagonal gradient transitioning from **Deep Electric Blue (#2A1FB8)** to **Violet (#7B2FF7)** and ending in **Hot Magenta (#FF2E9A)**. This gradient is reserved exclusively for high-priority actions (e.g., "Deploy," "Sign Up"), progress indicators, and active navigation states.

**Text and Borders:**
- **Headings/Primary Text:** #0A0A0A for maximum legibility and authority.
- **Body Text:** #52525B to reduce visual fatigue in long-form technical content.
- **Borders:** A strict 1px solid application of #0A0A0A or #18181B defines the structural grid.

## Typography

The system utilizes a tri-font hierarchy to balance marketing appeal with functional utility.

- **Inter** is the primary headline font, chosen for its clarity and institutional presence at large scales.
- **Geist** serves as the primary UI and body typeface, offering a clean, technical, and developer-centric feel for application interfaces.
- **JetBrains Mono** is strictly applied to technical data, code snippets, logs, and metadata labels. This monospaced font provides the "precision" cues necessary for a RAG routing platform.

Scale headlines down for mobile devices: `headline-xl` should transition to 32px and `headline-lg` to 24px to maintain readability on smaller screens.

## Layout & Spacing

This design system uses a **Fixed Grid** model for the core dashboard and documentation, centered on a 1440px maximum container. The rhythm is based on an 8px base unit.

- **Desktop (1280px+):** 12-column grid with 24px gutters and 48px side margins.
- **Tablet (768px - 1279px):** 8-column grid with 16px gutters and 24px side margins.
- **Mobile (<767px):** 4-column grid with 16px gutters and 16px side margins.

Content density should be kept relatively low to maintain the "clean corporate" aesthetic. Use 32px or 48px of vertical padding between major sections to emphasize the premium feel of the platform.

## Elevation & Depth

Hierarchy is established primarily through **Bold Borders** and **Tonal Layers** rather than shadows. 

The system avoids traditional fuzzy drop shadows in favor of a flat, architectural approach. Elevation is conveyed by placing white containers on #FAFAFA surfaces, outlined with a crisp 1px border. 

For the **Primary Accent Buttons** only, a "glossy" depth is introduced. This is achieved using a subtle internal white-to-transparent gradient (10% opacity) on top of the brand gradient, combined with a very soft, tinted outer glow (`#7B2FF7` at 15% opacity, 10px blur) to make the element appear energized.

## Shapes

The shape language is "Soft-Geometric." A standard corner radius of 8px to 10px is used for all containers, input fields, and buttons. This avoids the harshness of sharp corners while maintaining a professional, structured look. 

Large dashboard cards and primary containers should lean toward 10px, while smaller components like tags or checkboxes should utilize 8px. Do not use full-pill shapes for buttons; maintain the soft-rectangle aesthetic to preserve the corporate tone.

## Components

**Buttons:**
- **Primary (Accent):** 135° Brand Gradient background, white text, 10px radius. On hover, apply a 1px solid inner stroke of #3FFFC0 (Teal-Green) to create a "rim light" effect and slightly increase the outer glow.
- **Secondary (Default):** White background, 1px solid #0A0A0A border, black text. Minimalist and flat.
- **Tertiary:** Ghost style, no border, #52525B text.

**Input Fields:**
- White background, 1px #18181B border, 8px radius. Text in Geist #0A0A0A. Focus state replaces the border with a 1px solid Deep Electric Blue (#2A1FB8).

**Cards:**
- White background, 1px solid #18181B border, 10px radius. No shadow. Use #FAFAFA for card headers to separate metadata from content.

**Iconography:**
- Use 24px outline icons with a 1.5px or 2px stroke weight. Icons must be #0A0A0A for primary actions or #52525B for secondary/decorative elements.

**Progress Bars & Active States:**
- Always use the 135° Brand Gradient. For active navigation links, use a 2px vertical gradient line to the left of the menu item.

**Code Blocks:**
- Background #0A0A0A, text JetBrains Mono in white or light gray. Syntax highlighting should utilize the Violet and Teal-Green colors from the palette.