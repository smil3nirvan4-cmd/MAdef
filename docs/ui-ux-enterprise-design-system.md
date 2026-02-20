# Design System: Mãos Amigas Enterprise (2026)

## 1. Brand Identity (Extracted)
*   **Primary Brand (Teal)**: `#339977` (Verified from `maosamigas.com`).
*   **Action/CTA (Orange)**: `#f97316` (High priority actions).
*   **Enterprise Navy**: `#363d49` (Sidebar, Footer, Headings).
*   **Background**: `#ffffff` (Clean white).

## 2. Design Tokens (CSS Variables)

### Palette
```css
:root {
  /* Brand */
  --ma-brand: #339977;
  --ma-brand-hover: #2b8063;
  --ma-brand-soft: #e6f8f2;

  /* Action (Orange) */
  --ma-action: #f97316;
  --ma-action-hover: #ea580c;

  /* Navy (Neutral +) */
  --ma-navy: #363d49;
  --ma-navy-soft: #f1f3f5;

  /* Surface */
  --ma-surface: #ffffff;
  --ma-surface-2: #f8fafc; /* Slate-50 */
  --ma-surface-3: #f1f5f9; /* Slate-100 */

  /* Text */
  --ma-text: #1e293b;        /* Slate-900 */
  --ma-text-secondary: #64748b; /* Slate-500 */
  --ma-text-on-brand: #ffffff;

  /* UI */
  --ma-border: #cbd5e1;      /* Slate-300 */
  --ma-border-weak: #e2e8f0; /* Slate-200 */
  --ma-ring: #339977;        /* Brand matches ring */
  --ma-radius: 0.5rem;       /* 8px */
}
```

### Typography
*   **Font Family**: `Inter, system-ui, sans-serif` (Google Font to be added).
*   **Scale**:
    *   H1: `1.875rem` (30px) / bold
    *   H2: `1.5rem` (24px) / semibold
    *   Body: `0.875rem` (14px) / regular
    *   Small: `0.75rem` (12px) / medium

## 3. Implementation Strategy
1.  Add `docs/ui-ux-enterprise-design-system.md` (this file). 
2.  Update `src/app/globals.css` with `:root` variables.
3.  Update `tailwind.config.ts` via `@theme` or `theme.extend`.
