'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Columns3, Download, FileSearch, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ColumnDef, DataTableProps } from './types';

function nodeToText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(nodeToText).join(' ');
    if (typeof value === 'object' && value && 'props' in value) {
        return nodeToText((value as { props?: { children?: unknown } }).props?.children);
    }
    return '';
}

function toCsvValue(raw: string): string {
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
}

function downloadCsv<T>(columns: ColumnDef<T>[], rows: T[]): void {
    const headers = columns.map((column) => column.header);
    const lines = [headers.map(toCsvValue).join(',')];

    for (const row of rows) {
        const line = columns
            .map((column) => toCsvValue(nodeToText(column.accessor(row))))
            .join(',');
        lines.push(line);
    }

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `export-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}

interface SortState {
    field: string;
    direction: 'asc' | 'desc';
}

export function DataTable<T>({
    tableId = 'default',
    columns,
    data,
    pagination,
    loading,
    error,
    emptyMessage = 'Nenhum resultado encontrado.',
    onPageChange,
    onSort,
    onExportCSV,
    caption,
}: DataTableProps<T>) {
    const [columnMenuOpen, setColumnMenuOpen] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const defaults: Record<string, boolean> = {};
        for (const column of columns) {
            defaults[column.key] = !column.hidden;
        }

        if (typeof window === 'undefined') {
            return defaults;
        }

        const storageKey = `dt-columns-${tableId}`;
        const persisted = window.localStorage.getItem(storageKey);
        if (!persisted) return defaults;

        try {
            const parsed = JSON.parse(persisted) as Record<string, boolean>;
            return { ...defaults, ...parsed };
        } catch {
            return defaults;
        }
    });
    const [sort, setSort] = useState<SortState>({ field: '', direction: 'desc' });

    useEffect(() => {
        const storageKey = `dt-columns-${tableId}`;
        localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }, [tableId, visibleColumns]);

    const activeColumns = useMemo(
        () => columns.filter((column) => visibleColumns[column.key] !== false),
        [columns, visibleColumns]
    );

    const handleSort = (column: ColumnDef<T>) => {
        if (!column.sortable) return;
        const direction: 'asc' | 'desc' =
            sort.field === column.key && sort.direction === 'asc' ? 'desc' : 'asc';
        setSort({ field: column.key, direction });
        onSort?.(column.key, direction);
    };

    const exportCsv = () => {
        if (onExportCSV) {
            onExportCSV();
            return;
        }
        downloadCsv(activeColumns, data);
    };

    const rangeText = useMemo(() => {
        if (!pagination) return null;
        if (pagination.total === 0) return 'Mostrando 0 resultados';
        const start = ((pagination.page - 1) * pagination.pageSize) + 1;
        const end = Math.min(pagination.page * pagination.pageSize, pagination.total);
        return `Mostrando ${start}-${end} de ${pagination.total} resultados`;
    }, [pagination]);

    return (
        <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>{caption ? <p className="text-sm text-foreground">{caption}</p> : null}</div>
                <div className="relative flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setColumnMenuOpen((value) => !value)} aria-label="Selecionar colunas visíveis">
                        <Columns3 className="h-4 w-4" />
                        Colunas
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportCsv} aria-label="Exportar dados como CSV">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>

                    {columnMenuOpen && (
                        <div className="absolute right-0 top-10 z-20 min-w-52 rounded-lg border border-border bg-card p-2 shadow-lg">
                            {columns.map((column) => (
                                <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-background transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns[column.key] !== false}
                                        onChange={(event) => {
                                            const checked = event.target.checked;
                                            setVisibleColumns((prev) => ({ ...prev, [column.key]: checked }));
                                        }}
                                        className="accent-primary-600"
                                    />
                                    {column.header}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {error ? (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-error-100 bg-error-50 px-3 py-2 text-sm text-error-700">
                    <XCircle className="h-4 w-4" />
                    {error}
                </div>
            ) : null}

            <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
                <table className="w-full text-sm text-foreground">
                    <thead className="bg-surface-subtle border-b border-border">
                        <tr>
                            {activeColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                    style={{ width: column.width || 'auto' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSort(column)}
                                        className="flex items-center gap-1 hover:text-primary transition-colors"
                                    >
                                        {column.header}
                                        {column.sortable ? (
                                            sort.field === column.key ? (
                                                sort.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                            ) : (
                                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                            )
                                        ) : null}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <tr key={`skeleton-${index}`} className="animate-pulse">
                                    {activeColumns.map((column) => (
                                        <td key={`${column.key}-${index}`} className="px-4 py-4">
                                            <div className="h-4 w-3/4 rounded-sm bg-surface-subtle" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td className="px-4 py-12 text-center text-muted-foreground" colSpan={Math.max(1, activeColumns.length)}>
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="rounded-full bg-surface-subtle p-4 border border-border">
                                            <FileSearch className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                        <span className="text-base font-medium">{emptyMessage}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="group hover:bg-surface-subtle transition-colors duration-150">
                                    {activeColumns.map((column) => (
                                        <td key={`${column.key}-${rowIndex}`} className="px-4 py-3 align-middle tabular-nums text-foreground group-hover:text-foreground">
                                            {column.accessor(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-foreground">
                    <span>{rangeText}</span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!pagination.hasPrev}
                            onClick={() => onPageChange?.(pagination.page - 1)}
                        >
                            ← Anterior
                        </Button>
                        <span className="text-muted-foreground">
                            {pagination.page} / {Math.max(pagination.totalPages, 1)}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!pagination.hasNext}
                            onClick={() => onPageChange?.(pagination.page + 1)}
                        >
                            Próximo →
                        </Button>
                    </div>
                </div>
            ) : null}
        </Card>
    );
}
