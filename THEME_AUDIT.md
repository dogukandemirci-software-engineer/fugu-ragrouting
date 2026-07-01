# FUGU Theme Audit — Phase 0

**Date:** 2026-07-01  
**Source:** `frontend/theme/*/code.html` (30 HTML files analyzed)  
**Output:** `frontend/src/theme/tokens.ts`, `frontend/tailwind.config.ts`, `frontend/src/theme/globals.css`

---

## Findings

### ✅ Consistent Across All Files

| Token | Value | Usage |
|---|---|---|
| `accent-violet` | `#7B2FF7` | Primary brand color, gradient start |
| `accent-teal-glow` | `#3FFFC0` | Logo, charts, teal gradient end |
| `accent-magenta` | `#FF2E9A` | Gradient end, hero accent |
| `secondary` | `#4a46d5` | Sidebar active nav, chips |
| `secondary-container` | `#6462ef` | Badge backgrounds |
| Background hierarchy | `#fbf8ff` → `#ffffff` | 8-level surface system |
| `on-surface` | `#1a1b23` | Primary text |
| `border-subtle` | `#18181B` | All borders |
| Three-stop brand gradient | `135deg, #7B2FF7 → #2A1FB8 → #FF2E9A` | Primary CTA buttons |

---

## Inconsistencies Found & Resolutions

### 1. Brand Gradient — 3 Variants

**Files:** `dashboard_fugu`, `api_keys_fugu`, `usage_billing_fugu`, `team_fugu`, `settings_fugu`, `fugu_intelligent_rag_routing`

**Inconsistency:**
- `dashboard_fugu`, `fugu_intelligent_rag_routing`: uses three-stop `#7B2FF7 → #2A1FB8 → #FF2E9A`
- `api_keys_fugu`: uses two-stop `#7B2FF7 → #2A1FB8` (no magenta)
- Logo/charts: uses two-stop `#7B2FF7 → #3FFFC0` (violet → teal)

**Resolution:** All three variants are intentional for different contexts:
- `bg-brand-primary` → three-stop (CTA buttons, primary actions)
- `bg-brand-indigo` → two-stop violet-indigo (secondary accent elements)
- `bg-brand-teal` → two-stop violet-teal (logo, chart fills, progress bars)

### 2. Primary Button Class Name Inconsistency

**Files across multiple pages use different class names for the same button style:**
- `dashboard_fugu`: `.primary-accent-btn`
- `api_keys_fugu`: `.accent-btn`
- `usage_billing_fugu`: `.brand-gradient`
- `team_fugu`: `.primary-accent-button`
- `settings_fugu`: `.primary-accent-button`
- `fugu_intelligent_rag_routing`: `.btn-primary`

**Resolution:** Normalized to single `.btn-brand` class in `globals.css`. All variants share identical visual output (same gradient, same shadow, same hover state). Most common pattern: gradient + `0 4px 10px -2px rgba(123, 47, 247, 0.15)` shadow.

### 3. Card Border Radius — 3 Values

**Inconsistency:**
- `rounded-lg` (8px): used in a few dashboard cards
- `rounded-[10px]` (10px): most common card radius across 20+ pages
- `rounded-xl` (12px): used in feature section cards on landing

**Resolution:** Primary card token set to `rounded-card` = 10px (most frequent). `rounded-xl` kept as variant for feature/marketing cards. `rounded-lg` = 8px for inputs/badges.

### 4. Font Sizes — Mix of Token and Arbitrary

**Inconsistency:** Some pages use custom font tokens (`text-body-sm`) while others use standard Tailwind (`text-sm`) and arbitrary values (`text-[12px]`, `text-[10px]`).

**Resolution:** Named tokens for all semantic sizes. Arbitrary values (`text-[10px]`, `text-[12px]`) permitted only for dense UI elements (timestamps, sub-labels) where no semantic token maps cleanly.

### 5. Missing HTML Files

The following pages exist only as `screen.png` (no `code.html`):
- `sign_up_fugu` — implemented from screenshot + pattern consistency with `log_in_fugu`
- `forgot_password_fugu` — implemented from screenshot
- `documents_fugu` — implemented from `documents_empty_fugu` + `document_detail_fugu`
- `query_explorer_fugu` — implemented from `query_explorer_fugu_mobile`
- `fugu_pricing` — implemented from screenshot
- `fugu_enterprise` — implemented from screenshot
- `contact_sales_fugu` — implemented from screenshot
- `onboarding_api_key_fugu` — implemented from screenshot

**Assumption:** These pages follow the same component patterns as their sibling pages. Any deviation caught during visual review should be noted and corrected.

### 6. CSS Custom Properties

**Finding:** Zero `--variable-name` CSS custom properties found across all files. Design system is 100% Tailwind-class-based.

**Resolution:** No migration needed. Token system implemented as Tailwind config + CSS utility classes only.

### 7. Hardcoded Status Colors (Not in Token Palette)

**Files:** `usage_billing_fugu`, `team_fugu`

**Values:** `#059669` (success), `#DC2626` (error/destructive), `#ECFDF5` (success bg)

**Resolution:** Added to token palette as `success-green`, `destructive-red`, `success-green-bg`. These override Tailwind's default `green-600`/`red-600` to match design exactly.

---

## Design System Summary

| Category | Count | Notes |
|---|---|---|
| Named colors | 44 | Full Material Design 3 surface hierarchy |
| Gradient variants | 5 | 3 brand, 1 text, 1 ambient |
| Font families | 3 | Inter, Geist, JetBrains Mono |
| Font size tokens | 9 | headline-xl to label-caps |
| Shadow variants | 7 | All violet/teal glow |
| Border radius values | 5 | 4/8/10/12/9999px |
| Button variants | 4 | brand, secondary, destructive, ghost |
| Badge variants | 4 | full-access, read-only, success, error |

---

## For Designer Sync

When updating the Stitch designs:
1. Any new color must be added to `frontend/src/theme/tokens.ts` AND `tailwind.config.ts`
2. The three gradient variants are intentional — do not merge them
3. Card radius should stay at 10px unless deliberately changing brand feel
4. The `border-subtle: #18181B` (near-black) border style is intentional for subtle separation on white surfaces — do not replace with grey
