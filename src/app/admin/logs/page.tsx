'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface SystemLog {
    id: string;
    type: string;
    action: string;
    message: string;
    metadata: string | null;
    stack: string | null;
    userId: string | null;
    createdAt: string;
}

const LOG_TYPES = ['ALL', 'ERROR', 'INFO', 'WARNING', 'WHATSAPP', 'DEBUG'] as const;

const TYPE_VARIANTS: Record<string, 'error' | 'info' | 'warning' | 'success' | 'default' | 'purple'> = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    WHATSAPP: 'success',
    DEBUG: 'default',
};

export default function LogsPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [searchAction, setSearchAction] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                ...(selectedType !== 'ALL' && { type: selectedType }),
                ...(searchAction && { action: searchAction }),
                ...(searchPhone && { phone: searchPhone }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            });

            const res = await fetch(`/api/admin/logs?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotalPages(data.totalPages);
                setTotal(data.total);
            }
        } finally {
            setLoading(false);
        }
    }, [page, selectedType, searchAction, searchPhone, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchLogs]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const parseMetadata = (metadata: string | null) => {
        if (!metadata) return null;
        try { return JSON.parse(metadata); } catch { return metadata; }
    };

    const extractPhone = (log: SystemLog): string | null => {
        if (!log.metadata) return null;
        try {
            const meta = JSON.parse(log.metadata);
            return meta.telefone || meta.phone || meta.pacienteTelefone || null;
        } catch { return null; }
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Logs do Sistema"
                description="Monitoramento em tempo real de todas as operações"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Logs' }
                ]}
            />

            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">Tipo:</label>
                        <select
                            value={selectedType}
                            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {LOG_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-48">
                        <Input
                            placeholder="Filtrar por action..."
                            value={searchAction}
                            onChange={(e) => { setSearchAction(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="w-48">
                        <Input
                            placeholder="Filtrar por telefone..."
                            icon={Search}
                            value={searchPhone}
                            onChange={(e) => { setSearchPhone(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">De</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Ate</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Auto-refresh (5s)
                    </label>

                    <Button
                        variant="outline"
                        onClick={fetchLogs}
                        isLoading={loading}
                        className="ml-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar
                    </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>Total: <strong className="text-gray-900">{total}</strong> logs</span>
                    <span>Página {page} de {totalPages}</span>
                </div>
            </Card>

            {/* Logs List */}
            <Card noPadding>
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            {loading ? 'Carregando...' : 'Nenhum log encontrado'}
                        </div>
                    ) : (
                        logs.map((log) => {
                            const phone = extractPhone(log);
                            const isExpanded = expandedLog === log.id;
                            return (
                                <div key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <div
                                        className="p-4 flex items-start gap-4 cursor-pointer"
                                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant={TYPE_VARIANTS[log.type] || 'default'}>
                                                    {log.type}
                                                </Badge>
                                                <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                                                {phone && (
                                                    <Link
                                                        href={`/admin/usuarios/logs/${phone.replace(/\D/g, '')}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        {phone} <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                )}
                                            </div>
                                            <p className="text-sm font-mono text-gray-700">{log.action}</p>
                                            <p className="text-sm text-gray-500 truncate">{log.message}</p>
                                        </div>
                                    </div>

                                    {isExpanded && log.metadata && (
                                        <div className="px-4 pb-4 pl-12">
                                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                                                {JSON.stringify(parseMetadata(log.metadata), null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-gray-600 px-4">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </div>
    );
}
