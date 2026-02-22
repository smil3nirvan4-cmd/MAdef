'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { DataTable } from '@/components/admin/data-table/DataTable';
import { FilterBar, type FilterField } from '@/components/admin/data-table/FilterBar';
import type { ColumnDef } from '@/components/admin/data-table/types';
import { useDataTable } from '@/hooks/use-data-table';
import type { ApiPagination } from '@/lib/api/types';

interface SystemLogRow {
    id: string;
    type: string;
    action: string;
    message: string;
    metadata: string | null;
    stack: string | null;
    userId: string | null;
    createdAt: string;
}

interface LogsResponse {
    success: boolean;
    data?: SystemLogRow[];
    pagination?: ApiPagination;
    error?: { message?: string };
}

interface DbSchemaStatusResponse {
    success: boolean;
    dbSchemaOk?: boolean;
    missingColumns?: string[];
}

const TYPE_VARIANTS: Record<string, BadgeVariant> = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    WHATSAPP: 'success',
    DEBUG: 'default',
};

const FILTER_FIELDS: FilterField[] = [
    {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
            { label: 'Error', value: 'ERROR' },
            { label: 'Warning', value: 'WARNING' },
            { label: 'Info', value: 'INFO' },
            { label: 'WhatsApp', value: 'WHATSAPP' },
            { label: 'Debug', value: 'DEBUG' },
        ],
    },
    { key: 'action', label: 'Acao', type: 'text', placeholder: 'Filtrar por acao...' },
    { key: 'phone', label: 'Telefone', type: 'text', placeholder: 'Filtrar por telefone...' },
    { key: 'created', label: 'Data', type: 'date-range' },
];

function parseRequestId(metadata: string | null): string {
    if (!metadata) return '-';
    try {
        const parsed = JSON.parse(metadata);
        const requestId = String(parsed?.requestId || '').trim();
        return requestId || '-';
    } catch {
        return '-';
    }
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
}

function buildQueryString(args: {
    page: number;
    pageSize: number;
    sort: { field: string; direction: 'asc' | 'desc' };
    filters: Record<string, string>;
}): string {
    const params = new URLSearchParams();
    params.set('page', String(args.page));
    params.set('pageSize', String(args.pageSize));
    params.set('sort', `${args.sort.field}:${args.sort.direction}`);

    const filterEntries = Object.entries(args.filters)
        .filter(([key, value]) => value.trim() && !['createdFrom', 'createdTo'].includes(key))
        .map(([key, value]) => `${key}:${value.trim()}`);
    if (filterEntries.length > 0) {
        params.set('filter', filterEntries.join(','));
    }

    if (args.filters.createdFrom) params.set('startDate', args.filters.createdFrom);
    if (args.filters.createdTo) params.set('endDate', args.filters.createdTo);

    return params.toString();
}

function LogsPageContent() {
    const table = useDataTable({
        defaultPageSize: 20,
        defaultSort: { field: 'createdAt', direction: 'desc' },
        defaultFilters: {},
        syncWithUrl: true,
    });

    const [rows, setRows] = useState<SystemLogRow[]>([]);
    const [pagination, setPagination] = useState<ApiPagination | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbSchemaStatus, setDbSchemaStatus] = useState<{ ok: boolean; missingColumns: string[] }>({
        ok: true,
        missingColumns: [],
    });

    const queryString = useMemo(() => (
        buildQueryString({
            page: table.page,
            pageSize: table.pageSize,
            sort: table.sort,
            filters: table.filters,
        })
    ), [table.page, table.pageSize, table.sort, table.filters]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/logs?${queryString}`, { cache: 'no-store' });
            const payload: LogsResponse = await response.json().catch(() => ({ success: false }));

            if (!response.ok || !payload.success) {
                throw new Error(payload.error?.message || 'Failed to load logs');
            }

            setRows(payload.data || []);
            setPagination(payload.pagination);
        } catch (fetchError) {
            setRows([]);
            setPagination(undefined);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load logs');
        } finally {
            setLoading(false);
        }
    }, [queryString]);

    const fetchSchemaStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/capabilities', { cache: 'no-store' });
            const payload: DbSchemaStatusResponse = await response.json().catch(() => ({ success: false }));
            if (!response.ok || !payload.success) return;
            setDbSchemaStatus({
                ok: payload.dbSchemaOk !== false,
                missingColumns: Array.isArray(payload.missingColumns) ? payload.missingColumns : [],
            });
        } catch {
            setDbSchemaStatus((prev) => prev);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchSchemaStatus();
    }, [fetchSchemaStatus]);

    const columns = useMemo<ColumnDef<SystemLogRow>[]>(() => ([
        {
            key: 'type',
            header: 'Tipo',
            sortable: true,
            width: '130px',
            accessor: (row) => (
                <Badge variant={TYPE_VARIANTS[row.type] || 'default'}>
                    {row.type}
                </Badge>
            ),
        },
        {
            key: 'action',
            header: 'Acao',
            sortable: true,
            accessor: (row) => (
                <div className="space-y-1">
                    <p className="font-mono text-xs text-foreground">{row.action}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{row.message}</p>
                </div>
            ),
        },
        {
            key: 'userId',
            header: 'Usuario',
            accessor: (row) => row.userId || '-',
            hidden: true,
        },
        {
            key: 'requestId',
            header: 'Request ID',
            accessor: (row) => (
                <span className="font-mono text-xs text-foreground">{parseRequestId(row.metadata)}</span>
            ),
            hidden: true,
        },
        {
            key: 'createdAt',
            header: 'Criado em',
            sortable: true,
            width: '200px',
            accessor: (row) => formatDate(row.createdAt),
        },
        {
            key: 'details',
            header: 'Detalhes',
            width: '110px',
            accessor: (row) => (
                <Link href={`/admin/logs/${row.id}`} className="text-sm text-primary hover:underline">
                    Abrir
                </Link>
            ),
        },
    ]), []);

    const totalRows = pagination?.total || 0;

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title="Logs do Sistema"
                description="Acompanhe acoes, IDs de requisicao e falhas operacionais."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Logs' },
                ]}
            />

            {!dbSchemaStatus.ok ? (
                <div className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
                    <p className="font-medium">Database schema drift detectado.</p>
                    <p className="mt-1">
                        Missing columns: {dbSchemaStatus.missingColumns.join(', ') || 'nao informado'}.
                    </p>
                </div>
            ) : null}

            <FilterBar
                fields={FILTER_FIELDS}
                values={table.filters}
                onChange={table.setFilter}
                onClear={table.clearAllFilters}
            />

            <DataTable
                tableId="admin-logs"
                columns={columns}
                data={rows}
                pagination={pagination}
                loading={loading}
                error={error}
                emptyMessage="Nenhum log encontrado para os filtros selecionados."
                onPageChange={table.setPage}
                onSort={table.setSort}
                caption={`Total logs: ${totalRows}`}
            />
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="p-6 lg:p-8 text-sm text-muted-foreground">Carregando logs...</div>}>
            <LogsPageContent />
        </Suspense>
    );
}
