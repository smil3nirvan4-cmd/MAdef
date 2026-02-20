# UI/UX Audit — Mãos Amigas Admin

## 1. Page & Module Map

| Module | Route | Pattern | Size |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | Stats cards | Small |
| Avaliações list | `/admin/avaliacoes` | PageHeader + FilterBar + DataTable | 283 lines |
| Avaliações Nova | `/admin/avaliacoes/nova` | Multi-step wizard | 1860 lines |
| Avaliação Detail | `/admin/avaliacoes/[id]` | Detail page | — |
| Orçamentos list | `/admin/orcamentos` | Manual inline table | 301 lines |
| Orçamento Detail | `/admin/orcamentos/[id]` | Detail page | — |
| Pacientes list | `/admin/pacientes` | List | — |
| Paciente Detail | `/admin/pacientes/[id]` | Detail | — |
| Cuidadores list | `/admin/cuidadores` | List | — |
| Candidatos list | `/admin/candidatos` | List | — |
| Leads list | `/admin/leads` | List | — |
| WhatsApp | `/admin/whatsapp` | 16-tab mega page | 691 lines |
| Logs list | `/admin/logs` | PageHeader + FilterBar + DataTable | 282 lines |
| Log Detail | `/admin/logs/[id]` | Detail page | — |
| Triagens | `/admin/triagens` | List | — |
| Usuários | `/admin/usuarios` | List | — |
| Relatórios | `/admin/relatorios` | Report view | — |
| Formulários | `/admin/formularios` | Forms | — |
| Alocação | `/admin/alocacao` | Schedule | — |

## 2. Architecture Snapshot

- **Layout**: `src/app/admin/layout.tsx` — client-side sidebar + fixed topbar
- **Globals**: `src/app/globals.css` — imports Tailwind v4 + `colors.css` tokens
- **Tokens**: `src/styles/tokens/colors.css` — neutral + primary (blue) + success/warning/error
- **Root Layout**: `src/app/layout.tsx` — Geist font via `next/font/google`
- **Components**:
  - `ui/Button.tsx` — 5 variants, 3 sizes, loading state
  - `ui/Input.tsx` — with label, error, icon
  - `ui/Card.tsx` — simple white card, optional noPadding
  - `ui/Badge.tsx` — 6 variants (default/success/warning/error/info/purple)
  - `layout/PageHeader.tsx` — title, description, breadcrumbs, actions
  - `admin/data-table/DataTable.tsx` — columns, sorting, pagination, CSV export, column picker
  - `data-display/StatCard.tsx` — stat display
  - `data-display/TanStackDataTable.tsx` — TanStack integration

## 3. Findings

### 3.1 Color Inconsistencies
- **Tokens define blue as primary** but the brand should be **teal** (#0E8987 / #00B0B9).
- Components mix `gray-*` and `slate-*` interchangeably (Button uses `gray-*`, DataTable uses `slate-*`).
- Sidebar active state uses `bg-blue-50 text-blue-700` — should be teal.
- WhatsApp active state uses `bg-emerald-50` — inconsistent with other active states.
- Hardcoded color strings everywhere instead of CSS variable references.

### 3.2 Typography
- Global `font-family: Arial, Helvetica, sans-serif` overrides the Geist font loaded in root layout.
- No typographic scale defined (no h1–h4 tokens, no caption/mono sizes).
- Font sizes are ad-hoc: `text-[11px]`, `text-xs`, `text-sm`, `text-2xl`, `text-base` with no hierarchy.

### 3.3 Table Inconsistencies
- Avaliações/Logs use `DataTable` component; Orçamentos uses inline manual `<table>`.
- WhatsApp sub-tabs each have their own inline table markup with different padding and styling.
- No sticky headers on any table.

### 3.4 Missing Components
- **No Modal/Dialog** — destructive actions use `window.confirm()`.
- **No EmptyState** — some tables show plain text, others show an icon + text.
- **No LoadingState** outside DataTable — WhatsApp tabs show bare "Carregando…".
- **No Tooltip** component.
- **No Select** component (native `<select>` used inconsistently).

### 3.5 Layout Issues
- Content has `p-6 lg:p-8` padding but no `max-width` — stretches uncomfortably on ultrawide.
- Sidebar has no visual hierarchy between sections beyond a divider label.
- Topbar search uses generic `border-blue-500` focus — should be teal.
- No breadcrumb in topbar itself; only inside page content via `PageHeader`.

### 3.6 Forms
- The 1860-line `avaliacoes/nova/page.tsx` has all form logic inline with no visual grouping.
- No form section cards, no field hints, no progress indicator.
- Select fields are raw `<select>` elements with no styling consistency.

### 3.7 Accessibility
- No `aria-label` on sidebar toggle button.
- No `aria-current="page"` on active nav links.
- No focus trap in any overlay (sidebar drawer).
- No `role="dialog"` anywhere (no modal component exists).
- Sidebar drawer overlay has no keyboard close (Escape).
- Some buttons lack accessible names (icon-only buttons like Refresh).
- Color contrast: `text-[11px]` section labels in sidebar may fail WCAG AA.

### 3.8 States & Feedback
- No toast/notification system.
- API errors shown as inline red boxes (inconsistent styling).
- `window.confirm()` used for destructive actions (WhatsApp reset, template delete).
- Loading state in WhatsApp tabs is just text "Carregando…" with no skeleton.

## 4. UI Invariants (must NOT change)

1. All API endpoints, payloads, and response shapes must remain identical.
2. All business logic (pricing, scheduling, evaluation, RBAC) must not be altered.
3. Navigation routes (`/admin/*`) must stay the same.
4. Data fetching patterns (fetch calls, react-query usage) must not change.
5. Form submission logic and validation rules must remain.
6. WhatsApp bridge integration must not be touched.

## 5. Prioritized Plan (10 bullets)

1. **Design tokens + teal palette** — Replace blue primary with teal; unify gray/slate; add spacing/radius/shadow tokens.
2. **Typography** — Fix font-family override; adopt Inter; define typographic scale.
3. **Base components** — Create `SectionCard`, `Field`, `EmptyState`, `LoadingState`, `Modal`, `ConfirmDialog`.
4. **Layout overhaul** — Sidebar teal active states, topbar search restyle, content max-width, responsive drawer.
5. **Forms & Modals** — Standardize form grouping; replace `window.confirm()` with `ConfirmDialog`.
6. **Avaliações Nova** — Visual step cards, scenario highlighting, better error display.
7. **Logs** — Sticky headers, detail modal with copy, clean filters.
8. **WhatsApp** — Tab restyling (teal), consistent tables, empty/loading states.
9. **Mass standardization** — Apply DataTable + PageHeader pattern to Orçamentos and remaining pages.
10. **A11y + polish** — Focus visible, aria attributes, transitions, regression verification.
