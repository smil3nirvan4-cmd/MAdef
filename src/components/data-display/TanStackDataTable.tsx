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
                    className="h-9 w-72 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
                {toolbar}
                <span className="ml-auto text-xs text-slate-500">
                    {table.getFilteredRowModel().rows.length} registros
                </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td className="px-3 py-8 text-center text-slate-500" colSpan={columns.length}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 py-2 align-top text-slate-700">
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
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Anterior
                </button>
                <span className="text-xs text-slate-500">
                    Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
                </span>
                <button
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Próxima
                </button>
            </div>
        </div>
    );
}

