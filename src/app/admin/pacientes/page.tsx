'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/admin/data-table/DataTable';
import type { ColumnDef } from '@/components/admin/data-table/types';
import { FilterBar, type FilterField } from '@/components/admin/data-table/FilterBar';
import { useDataTable } from '@/hooks/use-data-table';
import type { ApiPagination } from '@/lib/api/types';

interface PacienteRow {
    id: string;
    nome: string | null;
    telefone: string;
    cidade: string | null;
    bairro: string | null;
    tipo: string;
    status: string;
    createdAt: string;
    _count?: {
        avaliacoes?: number;
        orcamentos?: number;
        alocacoes?: number;
        mensagens?: number;
    };
}

interface PacientesResponse {
    success: boolean;
    data?: PacienteRow[];
    pagination?: ApiPagination;
    stats?: {
        total: number;
        ativos: number;
        leads: number;
        avaliacao: number;
    };
    error?: { message?: string };
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
    LEAD: 'warning',
    AVALIACAO: 'info',
    ATIVO: 'success',
    INATIVO: 'default',
};

const FILTER_FIELDS: FilterField[] = [
    { key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome ou telefone...' },
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
            { label: 'LEAD', value: 'LEAD' },
            { label: 'AVALIACAO', value: 'AVALIACAO' },
            { label: 'ATIVO', value: 'ATIVO' },
            { label: 'INATIVO', value: 'INATIVO' },
        ],
    },
    { key: 'cidade', label: 'Cidade', type: 'text', placeholder: 'Filtrar por cidade...' },
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
    const cidade = args.filters.cidade?.trim();

    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (cidade) params.set('cidade', cidade);

    return params.toString();
}

function PacientesPageContent() {
    const table = useDataTable({
        defaultPageSize: 20,
        defaultSort: { field: 'createdAt', direction: 'desc' },
        syncWithUrl: true,
    });

    const [rows, setRows] = useState<PacienteRow[]>([]);
    const [pagination, setPagination] = useState<ApiPagination | undefined>(undefined);
    const [stats, setStats] = useState<PacientesResponse['stats'] | undefined>(undefined);
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
            const response = await fetch(`/api/admin/pacientes?${queryString}`, { cache: 'no-store' });
            const payload: PacientesResponse = await response.json().catch(() => ({ success: false }));
            if (!response.ok || !payload.success) {
                throw new Error(payload.error?.message || 'Failed to load pacientes');
            }

            setRows(payload.data || []);
            setPagination(payload.pagination);
            setStats(payload.stats);
        } catch (fetchError) {
            setRows([]);
            setPagination(undefined);
            setStats(undefined);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load pacientes');
        } finally {
            setLoading(false);
        }
    }, [queryString]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const columns = useMemo<ColumnDef<PacienteRow>[]>(() => ([
        {
            key: 'nome',
            header: 'Nome',
            sortable: true,
            accessor: (row) => (
                <div className="space-y-1">
                    <p className="font-medium text-foreground">{row.nome || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{row.tipo}</p>
                </div>
            ),
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
            key: 'cidade',
            header: 'Cidade',
            sortable: true,
            accessor: (row) => (
                <span>{row.cidade || '-'}</span>
            ),
        },
        {
            key: 'telefone',
            header: 'Telefone',
            accessor: (row) => row.telefone,
        },
        {
            key: 'createdAt',
            header: 'Criado em',
            sortable: true,
            accessor: (row) => new Date(row.createdAt).toLocaleString('pt-BR'),
        },
        {
            key: 'acoes',
            header: 'Acoes',
            width: '160px',
            accessor: (row) => (
                <div className="flex items-center gap-2">
                    <Link href={`/admin/pacientes/${row.id}`} className="text-sm text-primary hover:underline">
                        Detalhes
                    </Link>
                    <a
                        href={`https://wa.me/${String(row.telefone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-secondary-600 hover:underline"
                    >
                        WhatsApp
                    </a>
                </div>
            ),
        },
    ]), []);

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title="Pacientes"
                description="Acompanhe pacientes ativos, status e historico de comunicacao."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Pacientes' },
                ]}
                actions={(
                    <Button variant="outline" size="sm" onClick={fetchRows} isLoading={loading}>
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                    </Button>
                )}
            />

            <div className="grid gap-3 md:grid-cols-4">
                <CardStat label="Total" value={stats?.total ?? pagination?.total ?? 0} />
                <CardStat label="Ativos" value={stats?.ativos ?? 0} />
                <CardStat label="Leads" value={stats?.leads ?? 0} />
                <CardStat label="Avaliacao" value={stats?.avaliacao ?? 0} />
            </div>

            <FilterBar
                fields={FILTER_FIELDS}
                values={table.filters}
                onChange={table.setFilter}
                onClear={table.clearAllFilters}
            />

            <DataTable
                tableId="admin-pacientes"
                columns={columns}
                data={rows}
                pagination={pagination}
                loading={loading}
                error={error}
                emptyMessage="Nenhum paciente encontrado."
                onPageChange={table.setPage}
                onSort={table.setSort}
                caption={`Total: ${pagination?.total || 0}`}
            />
        </div>
    );
}

export default function PacientesPage() {
    return (
        <Suspense fallback={<div className="p-6 lg:p-8 text-sm text-muted-foreground">Carregando pacientes...</div>}>
            <PacientesPageContent />
        </Suspense>
    );
}

function CardStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
    );
}
