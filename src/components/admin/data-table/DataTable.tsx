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
    if (typeof value === 'object' && value && 'props' in (value as any)) {
        return nodeToText((value as any).props?.children);
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
                <div>{caption ? <p className="text-sm text-slate-600">{caption}</p> : null}</div>
                <div className="relative flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setColumnMenuOpen((value) => !value)}>
                        <Columns3 className="h-4 w-4" />
                        Colunas
                    </Button>
                    <Button size="sm" variant="outline" onClick={exportCsv}>
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>

                    {columnMenuOpen && (
                        <div className="absolute right-0 top-10 z-20 min-w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                            {columns.map((column) => (
                                <label key={column.key} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns[column.key] !== false}
                                        onChange={(event) => {
                                            const checked = event.target.checked;
                                            setVisibleColumns((prev) => ({ ...prev, [column.key]: checked }));
                                        }}
                                    />
                                    {column.header}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {error ? (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <XCircle className="h-4 w-4" />
                    {error}
                </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {activeColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    style={{ width: column.width || 'auto' }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSort(column)}
                                        className="flex items-center gap-1"
                                    >
                                        {column.header}
                                        {column.sortable ? (
                                            sort.field === column.key ? (
                                                sort.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3 text-slate-300" />
                                            )
                                        ) : null}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <tr key={`skeleton-${index}`} className="animate-pulse">
                                    {activeColumns.map((column) => (
                                        <td key={`${column.key}-${index}`} className="px-3 py-3">
                                            <div className="h-4 rounded bg-slate-200" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td className="px-4 py-10 text-center text-slate-500" colSpan={Math.max(1, activeColumns.length)}>
                                    <div className="flex flex-col items-center gap-2">
                                        <FileSearch className="h-6 w-6 text-slate-300" />
                                        <span>{emptyMessage}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-slate-50">
                                    {activeColumns.map((column) => (
                                        <td key={`${column.key}-${rowIndex}`} className="px-3 py-2 align-top text-slate-700">
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>{rangeText}</span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!pagination.hasPrev}
                            onClick={() => onPageChange?.(pagination.page - 1)}
                        >
                            {'<- Prev'}
                        </Button>
                        <span>
                            {pagination.page} / {Math.max(pagination.totalPages, 1)}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!pagination.hasNext}
                            onClick={() => onPageChange?.(pagination.page + 1)}
                        >
                            {'Next ->'}
                        </Button>
                    </div>
                </div>
            ) : null}
        </Card>
    );
}
