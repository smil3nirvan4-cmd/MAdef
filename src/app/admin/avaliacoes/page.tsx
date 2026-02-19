'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/admin/data-table/DataTable';
import type { ColumnDef } from '@/components/admin/data-table/types';
import { FilterBar, type FilterField } from '@/components/admin/data-table/FilterBar';
import { useDataTable } from '@/hooks/use-data-table';
import { useCapabilities } from '@/hooks/use-capabilities';
import type { ApiPagination } from '@/lib/api/types';

interface AvaliacaoRow {
    id: string;
    status: string;
    nivelSugerido: string | null;
    valorProposto: string | null;
    whatsappEnviado: boolean;
    whatsappErro: string | null;
    createdAt: string;
    paciente: {
        id: string;
        nome: string | null;
        telefone: string;
        tipo?: string | null;
        cidade?: string | null;
    };
}

interface AvaliacaoResponse {
    success: boolean;
    data?: AvaliacaoRow[];
    pagination?: ApiPagination;
    error?: { message?: string };
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
    PENDENTE: 'warning',
    ENVIADA: 'info',
    EM_ANALISE: 'info',
    PROPOSTA_ENVIADA: 'purple',
    CONTRATO_ENVIADO: 'purple',
    APROVADA: 'success',
    REJEITADA: 'error',
    CONCLUIDA: 'success',
};

const FILTER_FIELDS: FilterField[] = [
    { key: 'search', label: 'Search', type: 'text', placeholder: 'Patient name or phone...' },
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
            { label: 'PENDENTE', value: 'PENDENTE' },
            { label: 'EM_ANALISE', value: 'EM_ANALISE' },
            { label: 'PROPOSTA_ENVIADA', value: 'PROPOSTA_ENVIADA' },
            { label: 'CONTRATO_ENVIADO', value: 'CONTRATO_ENVIADO' },
            { label: 'APROVADA', value: 'APROVADA' },
            { label: 'REJEITADA', value: 'REJEITADA' },
            { label: 'CONCLUIDA', value: 'CONCLUIDA' },
        ],
    },
    {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: [
            { label: 'HOME_CARE', value: 'HOME_CARE' },
            { label: 'HOSPITAL', value: 'HOSPITAL' },
        ],
    },
    { key: 'created', label: 'Created', type: 'date-range' },
];

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

    const search = args.filters.search?.trim();
    const status = args.filters.status?.trim();
    const tipo = args.filters.tipo?.trim();
    const createdFrom = args.filters.createdFrom?.trim();
    const createdTo = args.filters.createdTo?.trim();

    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (tipo) params.set('tipo', tipo);
    if (createdFrom) params.set('createdFrom', createdFrom);
    if (createdTo) params.set('createdTo', createdTo);

    return params.toString();
}

function AvaliacoesPageContent() {
    const { hasCapability } = useCapabilities();
    const table = useDataTable({
        defaultPageSize: 20,
        defaultSort: { field: 'createdAt', direction: 'desc' },
        syncWithUrl: true,
    });

    const [rows, setRows] = useState<AvaliacaoRow[]>([]);
    const [pagination, setPagination] = useState<ApiPagination | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const queryString = useMemo(() => (
        buildQueryString({
            page: table.page,
            pageSize: table.pageSize,
            sort: table.sort,
            filters: table.filters,
        })
    ), [table.page, table.pageSize, table.sort, table.filters]);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/avaliacoes?${queryString}`, { cache: 'no-store' });
            const payload: AvaliacaoResponse = await response.json().catch(() => ({ success: false }));
            if (!response.ok || !payload.success) {
                throw new Error(payload.error?.message || 'Failed to load avaliacoes');
            }

            setRows(payload.data || []);
            setPagination(payload.pagination);
        } catch (fetchError) {
            setRows([]);
            setPagination(undefined);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load avaliacoes');
        } finally {
            setLoading(false);
        }
    }, [queryString]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const columns = useMemo<ColumnDef<AvaliacaoRow>[]>(() => ([
        {
            key: 'paciente',
            header: 'Paciente',
            accessor: (row) => (
                <div className="space-y-1">
                    <p className="font-medium text-gray-900">{row.paciente?.nome || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500">{row.paciente?.telefone || '-'}</p>
                </div>
            ),
        },
        {
            key: 'tipo',
            header: 'Tipo',
            accessor: (row) => row.paciente?.tipo || '-',
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            accessor: (row) => (
                <Badge variant={STATUS_BADGE[row.status] || 'default'}>{row.status}</Badge>
            ),
        },
        {
            key: 'whatsapp',
            header: 'WhatsApp',
            accessor: (row) => (
                row.whatsappEnviado
                    ? <Badge variant="success">sent</Badge>
                    : row.whatsappErro
                        ? <Badge variant="error">error</Badge>
                        : <Badge variant="warning">pending</Badge>
            ),
        },
        {
            key: 'createdAt',
            header: 'Data',
            sortable: true,
            accessor: (row) => new Date(row.createdAt).toLocaleString('pt-BR'),
        },
        {
            key: 'acoes',
            header: 'Acoes',
            width: '290px',
            accessor: (row) => {
                const canSendProposta = hasCapability('SEND_PROPOSTA');
                const canSendContrato = hasCapability('SEND_CONTRATO');

                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/avaliacoes/${row.id}`} className="text-sm text-blue-600 hover:underline">
                            Details
                        </Link>
                        {canSendProposta ? (
                            <Link href={`/admin/avaliacoes/${row.id}`}>
                                <Button size="sm" variant="outline">
                                    <FileText className="h-3 w-3" />
                                    Configurar proposta
                                </Button>
                            </Link>
                        ) : null}
                        {canSendContrato ? (
                            <Link href={`/admin/avaliacoes/${row.id}`}>
                                <Button size="sm" variant="outline">
                                    <FileText className="h-3 w-3" />
                                    Configurar contrato
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                );
            },
        },
    ]), [hasCapability]);

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title="Avaliacoes"
                description="Track clinical evaluations and enqueue proposta/contrato deliveries."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Avaliacoes' },
                ]}
                actions={(
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchRows} isLoading={loading}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                        <Link href="/admin/avaliacoes/nova">
                            <Button size="sm">
                                New
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                )}
            />

            <FilterBar
                fields={FILTER_FIELDS}
                values={table.filters}
                onChange={table.setFilter}
                onClear={table.clearAllFilters}
            />

            <DataTable
                tableId="admin-avaliacoes"
                columns={columns}
                data={rows}
                pagination={pagination}
                loading={loading}
                error={error}
                emptyMessage="No avaliacao found."
                onPageChange={table.setPage}
                onSort={table.setSort}
                caption={`Rows: ${pagination?.total || 0}`}
            />
        </div>
    );
}

export default function AvaliacoesPage() {
    return (
        <Suspense fallback={<div className="p-6 lg:p-8 text-sm text-gray-500">Loading avaliacoes...</div>}>
            <AvaliacoesPageContent />
        </Suspense>
    );
}
