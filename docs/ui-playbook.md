# UI Playbook — Creating Admin Pages

## How to Create a New List Page

```tsx
'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/admin/data-table/DataTable';
import { FilterBar } from '@/components/admin/data-table/FilterBar';
import { Badge } from '@/components/ui/Badge';
import { useDataTable } from '@/hooks/use-data-table';

export default function MyListPage() {
    const { data, loading, error, pagination, filters, setFilters, clearFilters, setPage, handleSort } = useDataTable('/api/admin/my-endpoint');

    const columns = [
        { key: 'name', header: 'Nome', sortable: true, accessor: (row) => row.name },
        { key: 'status', header: 'Status', accessor: (row) => <Badge variant="success">{row.status}</Badge> },
    ];

    const filterFields = [
        { key: 'search', label: 'Buscar', type: 'text' as const, placeholder: 'Nome...' },
    ];

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Meu Módulo"
                description="Descrição do módulo"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Meu Módulo' },
                ]}
            />
            <div className="space-y-4">
                <FilterBar fields={filterFields} values={filters} onChange={(k, v) => setFilters({ ...filters, [k]: v })} onClear={clearFilters} />
                <DataTable columns={columns} data={data} pagination={pagination} loading={loading} error={error} onPageChange={setPage} onSort={handleSort} />
            </div>
        </div>
    );
}
```

## Available Components

| Component | Import | Purpose |
|---|---|---|
| `Button` | `@/components/ui/Button` | Primary, secondary, outline, ghost, danger |
| `Input` | `@/components/ui/Input` | Text input with label, error, hint, icon |
| `Card` | `@/components/ui/Card` | White card container |
| `Badge` | `@/components/ui/Badge` | Status labels (7 variants) |
| `Modal` | `@/components/ui/Modal` | Overlay dialog with focus trap |
| `ConfirmDialog` | `@/components/ui/ConfirmDialog` | Destructive action confirmation |
| `EmptyState` | `@/components/ui/EmptyState` | No results placeholder |
| `Skeleton` | `@/components/ui/Skeleton` | Loading placeholder |
| `SectionCard` | `@/components/ui/SectionCard` | Card with title bar + toolbar |
| `Field` | `@/components/ui/Field` | Form field wrapper with label/hint/error |
| `PageHeader` | `@/components/layout/PageHeader` | Page title + breadcrumbs + actions |
| `DataTable` | `@/components/admin/data-table/DataTable` | Sortable table with pagination |
| `FilterBar` | `@/components/admin/data-table/FilterBar` | Filter inputs for tables |

## Styling Rules

1. **Never use hardcoded Tailwind colors** like `blue-600` or `gray-500`
2. **Always use CSS variables**: `text-[var(--primary-600)]`, `bg-[var(--neutral-50)]`
3. **Radius**: Use `rounded-[var(--radius-md)]` or `rounded-[var(--radius-lg)]`
4. **Shadows**: Use `shadow-[var(--shadow-sm)]` or `shadow-[var(--shadow-md)]`
5. **Transitions**: Add `transition-colors duration-150` to interactive elements

## Replacing window.confirm()

```tsx
// Before (bad)
const handleDelete = () => {
    if (confirm('Are you sure?')) { /* delete */ }
};

// After (good)
const [confirmOpen, setConfirmOpen] = useState(false);
<ConfirmDialog
    open={confirmOpen}
    onClose={() => setConfirmOpen(false)}
    onConfirm={() => { /* delete */ setConfirmOpen(false); }}
    title="Excluir item"
    description="Tem certeza? Esta ação não pode ser desfeita."
    confirmLabel="Excluir"
    variant="danger"
/>
```
