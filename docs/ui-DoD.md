# UI Definition of Done (DoD)

## Every Admin Page Must Have

1. **PageHeader** with title, description, and breadcrumbs
2. **Token-based colors** — no hardcoded `blue-*`, `gray-*`, or `slate-*`
3. **Loading state** — Skeleton or spinner while data fetches
4. **Empty state** — `EmptyState` component when no results
5. **Error state** — Styled error banner using `--error-*` tokens
6. **Responsive** — Works on mobile (sidebar collapses, tables scroll)

## Every Component Must Have

1. Token-based colors from `colors.css` variables
2. `focus-visible` ring (inherits from globals.css)
3. `aria-label` on icon-only buttons
4. Transition duration (`duration-150`) on interactive states

## Every Form Must Have

1. Labels on all fields (via `Input` label prop or `Field` wrapper)
2. Error display via `role="alert"`
3. Destructive actions use `ConfirmDialog`, not `window.confirm()`

## Every Table Must Have

1. Use `DataTable` component (not inline `<table>`)
2. Sticky header
3. Column visibility picker
4. CSV export
5. Empty state when no rows

## Color Palette Reference

| Token | Hex | Usage |
|---|---|---|
| `--primary-500` | #00B0B9 | Focus rings, accents |
| `--primary-600` | #0E8987 | Buttons, active states |
| `--primary-700` | #0d7e7c | Hover states |
| `--neutral-50` | #F9FAFB | Page background |
| `--neutral-200` | #EAECF0 | Borders |
| `--neutral-500` | #667085 | Muted text |
| `--neutral-900` | #0B1220 | Primary text |
| `--error-600` | #dc2626 | Danger buttons |
| `--success-600` | #16a34a | Success badges |
