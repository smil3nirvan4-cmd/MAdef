'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, RotateCcw, Ban, Play } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface QueueItemDetails {
    id: string;
    phone: string;
    status: string;
    retries: number;
    error?: string | null;
    payload: string;
    payloadParsed?: any;
    intent?: string;
    preview?: string;
    createdAt: string;
    updatedAt: string;
    scheduledAt?: string | null;
    sentAt?: string | null;
    lastAttemptAt?: string | null;
    internalMessageId?: string | null;
    idempotencyKey?: string | null;
    providerMessageId?: string | null;
    resolvedMessageId?: string | null;
}

interface TimelineItem {
    event: string;
    status: string;
    at: string;
}

interface LogItem {
    id: string;
    type: string;
    action: string;
    message: string;
    metadata?: string | null;
    createdAt: string;
}

export default function QueueItemDetailsPage() {
    const params = useParams<{ queueItemId: string }>();
    const queueItemId = params.queueItemId;

    const [item, setItem] = useState<QueueItemDetails | null>(null);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    async function fetchDetails() {
        if (!queueItemId) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/whatsapp/queue/${queueItemId}`);
            const payload = await response.json().catch(() => ({}));
            if (response.ok && payload?.success) {
                setItem(payload.item || null);
                setTimeline(payload.timeline || []);
                setLogs(payload.logs || []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queueItemId]);

    async function runAction(action: 'reprocess' | 'cancel' | 'process') {
        if (!queueItemId) return;
        setActionLoading(true);
        try {
            await fetch(`/api/admin/whatsapp/queue/${queueItemId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            await fetchDetails();
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={`Queue Item ${queueItemId}`}
                description="Timeline, payload e logs correlatos."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'WhatsApp', href: '/admin/whatsapp' },
                    { label: 'Queue', href: '/admin/whatsapp/queue' },
                    { label: 'Detalhe' },
                ]}
                actions={(
                    <div className="flex gap-2">
                        <Link href="/admin/whatsapp/queue">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={fetchDetails} isLoading={loading}>
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </Button>
                    </div>
                )}
            />

            {item ? (
                <>
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card>
                            <h3 className="mb-3 font-semibold">Resumo</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Status</span><Badge>{item.status}</Badge></div>
                                <div className="flex justify-between"><span>Intent</span><span>{item.intent || '-'}</span></div>
                                <div className="flex justify-between"><span>Retries</span><span>{item.retries}</span></div>
                                <div className="flex justify-between"><span>Telefone</span><span className="font-mono">{item.phone}</span></div>
                                <div className="flex justify-between"><span>Internal ID</span><span className="font-mono text-xs">{item.internalMessageId || '-'}</span></div>
                                <div className="flex justify-between"><span>Provider ID</span><span className="font-mono text-xs">{item.providerMessageId || '-'}</span></div>
                                <div className="flex justify-between"><span>Resolved ID</span><span className="font-mono text-xs">{item.resolvedMessageId || '-'}</span></div>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="mb-3 font-semibold">Timeline</h3>
                            <div className="space-y-2 text-sm">
                                {timeline.map((entry, index) => (
                                    <div key={`${entry.event}-${index}`} className="rounded border border-slate-200 p-2">
                                        <p className="font-medium">{entry.event}</p>
                                        <p className="text-xs text-slate-500">{entry.status}</p>
                                        <p className="text-xs text-slate-500">{new Date(entry.at).toLocaleString('pt-BR')}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card>
                            <h3 className="mb-3 font-semibold">Acoes</h3>
                            <div className="space-y-2">
                                <Button className="w-full justify-start" onClick={() => runAction('process')} isLoading={actionLoading}>
                                    <Play className="h-4 w-4" />
                                    Processar
                                </Button>
                                <Button className="w-full justify-start" variant="outline" onClick={() => runAction('reprocess')} isLoading={actionLoading}>
                                    <RotateCcw className="h-4 w-4" />
                                    Reprocessar
                                </Button>
                                <Button className="w-full justify-start" variant="outline" onClick={() => runAction('cancel')} isLoading={actionLoading}>
                                    <Ban className="h-4 w-4" />
                                    Cancelar
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <Card className="mt-6">
                        <h3 className="mb-3 font-semibold">Payload</h3>
                        <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-emerald-400">
                            {JSON.stringify(item.payloadParsed || item.payload, null, 2)}
                        </pre>
                    </Card>

                    <Card className="mt-6">
                        <h3 className="mb-3 font-semibold">Logs Correlatos</h3>
                        <div className="space-y-3">
                            {logs.length === 0 ? (
                                <p className="text-sm text-slate-500">Nenhum log correlato encontrado.</p>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="rounded border border-slate-200 p-3">
                                        <div className="mb-1 flex items-center justify-between">
                                            <Badge>{log.type}</Badge>
                                            <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <p className="font-mono text-xs">{log.action}</p>
                                        <p className="text-sm">{log.message}</p>
                                        {log.metadata && (
                                            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-emerald-400">
                                                {log.metadata}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </>
            ) : (
                <Card>
                    <p className="text-sm text-slate-500">{loading ? 'Carregando...' : 'Queue item nao encontrado.'}</p>
                </Card>
            )}
        </div>
    );
}

