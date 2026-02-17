'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Play, RotateCcw, Ban, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TanStackDataTable } from '@/components/data-display/TanStackDataTable';

interface QueueItem {
    id: string;
    phone: string;
    status: string;
    retries: number;
    error?: string | null;
    preview: string;
    scheduledAt?: string | null;
    sentAt?: string | null;
    internalMessageId?: string | null;
    providerMessageId?: string | null;
}

interface QueueResponse {
    success: boolean;
    queue: QueueItem[];
    stats: Record<string, number>;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    pending: 'warning',
    sending: 'info',
    sent: 'success',
    retrying: 'info',
    dead: 'error',
    canceled: 'default',
};

export default function WhatsAppQueuePage() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const statusCards: Array<{ label: string; value: number }> = [
        { label: 'pending', value: stats.pending || 0 },
        { label: 'sending', value: stats.sending || 0 },
        { label: 'retrying', value: stats.retrying || 0 },
        { label: 'sent', value: stats.sent || 0 },
        { label: 'dead', value: stats.dead || 0 },
        { label: 'canceled', value: stats.canceled || 0 },
    ];

    const fetchQueue = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/whatsapp/queue?status=${filterStatus}`);
            const payload: QueueResponse = await response.json();
            if (payload?.success) {
                setItems(payload.queue || []);
                setStats(payload.stats || {});
            }
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    const runAction = async (action: 'process' | 'retry' | 'reprocess' | 'cancel' | 'clear_dead') => {
        await fetch('/api/admin/whatsapp/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ids: selectedIds }),
        });
        setSelectedIds([]);
        await fetchQueue();
    };

    const columns = useMemo<ColumnDef<QueueItem, unknown>[]>(() => [
        {
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(event) => setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])}
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(row.original.id)}
                    onChange={(event) => {
                        if (event.target.checked) {
                            setSelectedIds((prev) => [...prev, row.original.id]);
                        } else {
                            setSelectedIds((prev) => prev.filter((id) => id !== row.original.id));
                        }
                    }}
                />
            ),
        },
        {
            accessorKey: 'phone',
            header: 'Telefone',
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.phone}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={STATUS_VARIANT[row.original.status] || 'default'}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            accessorKey: 'preview',
            header: 'Mensagem',
            cell: ({ row }) => <span className="line-clamp-2 max-w-xl">{row.original.preview}</span>,
        },
        {
            accessorKey: 'retries',
            header: 'Retries',
        },
        {
            accessorKey: 'error',
            header: 'Erro',
            cell: ({ row }) => (
                <span className="line-clamp-2 max-w-sm text-xs text-red-600">
                    {row.original.error || '-'}
                </span>
            ),
        },
        {
            accessorKey: 'internalMessageId',
            header: 'Internal ID',
            cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.internalMessageId || '-'}</span>,
        },
        {
            accessorKey: 'providerMessageId',
            header: 'Provider ID',
            cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.providerMessageId || '-'}</span>,
        },
    ], [items, selectedIds]);

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="WhatsApp Queue"
                description="Outbox com retries, reprocessamento e DLQ."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'WhatsApp', href: '/admin/whatsapp' },
                    { label: 'Queue' },
                ]}
            />

            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
                {statusCards.map(({ label, value }) => (
                    <Card key={label} className="!p-3 cursor-pointer" onClick={() => setFilterStatus(label)}>
                        <p className="text-xl font-semibold">{value}</p>
                        <p className="text-xs uppercase text-slate-500">{label}</p>
                    </Card>
                ))}
            </div>

            <Card>
                <TanStackDataTable
                    data={items}
                    columns={columns}
                    emptyMessage={loading ? 'Carregando fila...' : 'Nenhum item encontrado'}
                    toolbar={(
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={fetchQueue} isLoading={loading}>
                                <RefreshCw className="w-4 h-4" />
                                Atualizar
                            </Button>
                            <Button size="sm" onClick={() => runAction('process')}>
                                <Play className="w-4 h-4" />
                                Processar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => runAction('retry')} disabled={!selectedIds.length}>
                                <RotateCcw className="w-4 h-4" />
                                Retry
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => runAction('reprocess')} disabled={!selectedIds.length}>
                                <RotateCcw className="w-4 h-4" />
                                Reprocessar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => runAction('cancel')} disabled={!selectedIds.length}>
                                <Ban className="w-4 h-4" />
                                Cancelar
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => runAction('clear_dead')}>
                                <Trash2 className="w-4 h-4" />
                                Limpar Dead
                            </Button>
                        </div>
                    )}
                />
            </Card>
        </div>
    );
}
