'use client';

import * as React from 'react';
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type PaginationState,
    type SortingState,
    useReactTable,
} from '@tanstack/react-table';

interface TanStackDataTableProps<TData> {
    data: TData[];
    columns: ColumnDef<TData, unknown>[];
    emptyMessage?: string;
    initialPageSize?: number;
    toolbar?: React.ReactNode;
}

export function TanStackDataTable<TData>({
    data,
    columns,
    emptyMessage = 'Nenhum registro encontrado.',
    initialPageSize = 20,
    toolbar,
}: TanStackDataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    });
    const [globalFilter, setGlobalFilter] = React.useState('');

    const table = useReactTable({
        data,
        columns,
        state: { sorting, pagination, globalFilter },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    value={globalFilter}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    placeholder="Filtrar..."
                    className="h-9 w-72 rounded-md border border-border-hover px-3 text-sm outline-none focus:border-primary-500"
                />
                {toolbar}
                <span className="ml-auto text-xs text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} registros
                </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                    <thead className="border-b bg-surface-subtle">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-border">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td className="px-3 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="hover:bg-background">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 py-2 align-top text-foreground">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-end gap-2">
                <button
                    className="rounded border border-border-hover px-3 py-1 text-xs font-medium text-foreground hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Anterior
                </button>
                <span className="text-xs text-muted-foreground">
                    Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
                </span>
                <button
                    className="rounded border border-border-hover px-3 py-1 text-xs font-medium text-foreground hover:bg-background hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Próxima
                </button>
            </div>
        </div>
    );
}

