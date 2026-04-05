# DVLP — Style Guide

**Product:** Developers VLP
**Last updated:** 2026-04-04

---

## Stack

- **CSS approach:** Custom CSS (`globals.css`) + CSS Modules (per page/component)
- **Global tokens:** `app/globals.css`
- **NOT used:** Tailwind CSS, Styled Components, Emotion, CSS-in-JS

---

## Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#020617` (slate-950) | Page background |
| `--text` | `#f1f5f9` (slate-100) | Primary text |
| `--text-muted` | `#64748b` (slate-500) | Secondary/muted text |
| `--text-placeholder` | `#334155` (slate-800) | Input placeholders |
| `--accent` | `#10b981` (emerald-500) | Primary accent, buttons, links |
| `--accent-hover` | `#34d399` (emerald-400) | Hover state |
| `--accent-dark` | `#059669` (emerald-600) | Gradient end |
| `--border` | `rgba(51,65,85,.4)` | Card borders |
| `--border-hover` | `rgba(16,185,129,.18)` | Hover border accent |
| `--surface` | `rgba(15,23,42,.5)` | Card backgrounds |
| `--input-bg` | `rgba(2,6,23,.6)` | Form input backgrounds |
| `--danger` | `#ef4444` | Error states |
| `--warning` | `#f59e0b` | Pending/in-progress states |
| `--info` | `#3b82f6` | Info/open states |

### Typography

| Element | Font | Weight | Size | Letter-spacing |
|---------|------|--------|------|---------------|
| Body | Sora | 400 | — | — |
| `.future-eyebrow` | Sora | 600 | 0.72rem | 0.28em |
| `.future-headline` | Sora | 600 | — | -0.045em |
| `.gradient-text` | — | — | — | emerald gradient fill |

### Spacing

No formal spacing scale. Common values from existing code:
- Section padding: varies per page
- Card padding: ~16-24px
- Button padding: `8px 18px` (default), `4px 12px` (.btn-sm)
- Input padding: `10px 14px`

### Border Radius

| Usage | Value |
|-------|-------|
| Cards | `12px` |
| Buttons | `8px` |
| Inputs | `8px` |
| Badges | `9999px` (pill) |
| Blobs | `9999px` (circle) |

---

## Layout Patterns

- Pages use `min-h-screen` + `flex flex-col` for full-height layout
- Background effects are `position: fixed` with `pointer-events: none`
- Content sections sit above background via `position: relative; z-index: 1`
- No global max-width constraint — pages manage their own

---

## Button Patterns

| Class | Style | Usage |
|-------|-------|-------|
| `.btn-primary` | Emerald gradient, dark text | Primary CTAs |
| `.btn-secondary` | Transparent, slate border | Secondary actions |
| `.btn-danger` | Red tint, red text | Destructive actions |
| `.btn-sm` | Smaller padding/font | Inline actions |

---

## Typography Patterns

| Class | Purpose |
|-------|---------|
| `.future-eyebrow` | Section labels (uppercase, tracked) |
| `.future-headline` | Section headings (tight tracking) |
| `.gradient-text` | Accent text with emerald gradient |

---

## Existing Components

| Component | File | Purpose |
|-----------|------|---------|
| Header | `components/Header.tsx` | Site navigation |
| Footer | `components/Footer.tsx` | Site footer |
| BackgroundEffects | `components/BackgroundEffects.tsx` | Animated blobs, grid, beacon |
| AuthGuard | `components/AuthGuard.tsx` | Session-gated content wrapper |
| AdminGuard | `components/AdminGuard.tsx` | Operator-role content wrapper |

---

## Page File Pattern

Each page route consists of:
- `app/{route}/page.tsx` — page component (client or server)
- `app/{route}/page.module.css` — optional page-specific styles

Shared styles live in `app/globals.css`.

---

## Self-Check

Before delivering any styled page:
1. Uses colors from the token table above — no hardcoded hex values
2. Uses `.btn-primary` / `.btn-secondary` — no ad-hoc button styles
3. Uses `.vlp-input` for form inputs
4. Uses `.vlp-card` for card containers
5. Font is Sora — no system font fallbacks in visible UI
6. Background effects use `BackgroundEffects` component
7. No Tailwind utility classes (project does not use Tailwind)
