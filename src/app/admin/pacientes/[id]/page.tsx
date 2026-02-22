'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCapabilities } from '@/hooks/use-capabilities';

interface PacienteDetail {
    id: string;
    nome: string | null;
    telefone: string;
    status: string;
    tipo: string;
    cidade: string | null;
    bairro: string | null;
    hospital: string | null;
    quarto: string | null;
    prioridade: string | null;
    createdAt: string;
    avaliacoes: Array<{
        id: string;
        status: string;
        createdAt: string;
        whatsappEnviado: boolean;
        whatsappErro: string | null;
    }>;
    orcamentos: Array<{
        id: string;
        status: string;
        valorFinal: number | null;
        enviadoEm: string | null;
        createdAt: string;
    }>;
    mensagens: Array<{
        id: string;
        direcao: string;
        conteudo: string;
        timestamp: string;
    }>;
}

interface SystemLogItem {
    id: string;
    type: string;
    action: string;
    message: string;
    createdAt: string;
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
    LEAD: 'warning',
    AVALIACAO: 'info',
    ATIVO: 'success',
    INATIVO: 'default',
};

function formatDate(value: string | null): string {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('pt-BR');
}

export default function PacienteDetalhePage() {
    const params = useParams<{ id: string }>();
    const pacienteId = params?.id;
    const { hasCapability } = useCapabilities();
    const canViewLogs = hasCapability('VIEW_LOGS');

    const [data, setData] = useState<PacienteDetail | null>(null);
    const [logs, setLogs] = useState<SystemLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pacienteId) return;

        let active = true;
        const fetchPaciente = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/admin/pacientes/${pacienteId}`, { cache: 'no-store' });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || !payload?.paciente) {
                    throw new Error(payload?.error || 'Erro ao carregar paciente');
                }

                if (active) setData(payload.paciente);
            } catch (fetchError) {
                if (active) {
                    setData(null);
                    setError(fetchError instanceof Error ? fetchError.message : 'Erro ao carregar paciente');
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchPaciente();
        return () => {
            active = false;
        };
    }, [pacienteId]);

    useEffect(() => {
        if (!data?.telefone || !canViewLogs) {
            setLogs([]);
            return;
        }

        let active = true;
        const fetchLogs = async () => {
            try {
                const params = new URLSearchParams({
                    page: '1',
                    pageSize: '20',
                    phone: data.telefone.replace(/\D/g, ''),
                    sort: 'createdAt:desc',
                });
                const response = await fetch(`/api/admin/logs?${params.toString()}`, { cache: 'no-store' });
                const payload = await response.json().catch(() => ({ success: false }));
                if (!active) return;
                if (response.ok && payload?.success) {
                    setLogs(payload.data || []);
                } else {
                    setLogs([]);
                }
            } catch {
                if (active) setLogs([]);
            }
        };

        fetchLogs();
        return () => {
            active = false;
        };
    }, [canViewLogs, data?.telefone]);

    const whatsappPhone = useMemo(
        () => String(data?.telefone || '').replace(/\D/g, ''),
        [data?.telefone]
    );

    if (loading) {
        return <div className="p-6 lg:p-8 text-sm text-muted-foreground">Carregando paciente...</div>;
    }

    if (error || !data) {
        return (
            <div className="p-6 lg:p-8 space-y-4">
                <PageHeader
                    title="Paciente"
                    description={error || 'Paciente nao encontrado'}
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin/dashboard' },
                        { label: 'Pacientes', href: '/admin/pacientes' },
                        { label: 'Detalhe' },
                    ]}
                />
                <Card>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-error-600">{error || 'Paciente nao encontrado'}</p>
                        <Link href="/admin/pacientes">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title={data.nome || 'Paciente'}
                description={`Telefone: ${data.telefone}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Pacientes', href: '/admin/pacientes' },
                    { label: data.id },
                ]}
                actions={(
                    <div className="flex items-center gap-2">
                        <Link href="/admin/pacientes">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                        {whatsappPhone ? (
                            <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer">
                                <Button size="sm">
                                    <Phone className="h-4 w-4" />
                                    WhatsApp
                                </Button>
                            </a>
                        ) : null}
                    </div>
                )}
            />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Status</p>
                    <Badge variant={STATUS_BADGE[data.status] || 'default'}>{data.status}</Badge>
                    <p className="mt-2 text-sm text-foreground">Prioridade: {data.prioridade || '-'}</p>
                    <p className="text-sm text-foreground">Tipo: {data.tipo}</p>
                </Card>
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Local</p>
                    <p className="text-sm text-foreground">{data.cidade || '-'} {data.bairro ? `- ${data.bairro}` : ''}</p>
                    {data.hospital ? <p className="text-sm text-foreground">Hospital: {data.hospital}</p> : null}
                    {data.quarto ? <p className="text-sm text-foreground">Quarto: {data.quarto}</p> : null}
                </Card>
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Criado</p>
                    <p className="text-sm text-foreground">{formatDate(data.createdAt)}</p>
                    <p className="mt-2 text-sm text-foreground">Avaliacoes: {data.avaliacoes?.length || 0}</p>
                    <p className="text-sm text-foreground">Orcamentos: {data.orcamentos?.length || 0}</p>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <p className="mb-3 text-xs uppercase text-muted-foreground">Avaliacoes</p>
                    {data.avaliacoes?.length ? (
                        <div className="space-y-2">
                            {data.avaliacoes.map((avaliacao) => (
                                <div key={avaliacao.id} className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={STATUS_BADGE[avaliacao.status] || 'default'}>{avaliacao.status}</Badge>
                                        <span className="text-xs text-muted-foreground">{formatDate(avaliacao.createdAt)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">WhatsApp: {avaliacao.whatsappEnviado ? 'enviado' : 'pendente'}</p>
                                    <Link href={`/admin/avaliacoes/${avaliacao.id}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                                        Abrir avaliacao
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Sem avaliacoes.</p>
                    )}
                </Card>

                <Card>
                    <p className="mb-3 text-xs uppercase text-muted-foreground">Mensagens WhatsApp</p>
                    <div className="max-h-[360px] space-y-2 overflow-auto">
                        {data.mensagens?.length ? (
                            data.mensagens.slice(0, 50).map((msg) => (
                                <div key={msg.id} className={`rounded-lg p-3 ${msg.direcao === 'OUT' ? 'bg-info-50' : 'bg-background'}`}>
                                    <p className="text-sm text-foreground">{msg.conteudo}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(msg.timestamp)}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Sem mensagens.</p>
                        )}
                    </div>
                </Card>
            </div>

            <Card>
                <p className="mb-3 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    Historico de Logs WhatsApp (filtrado por telefone)
                </p>
                {!canViewLogs ? (
                    <p className="text-sm text-muted-foreground">Role sem permissao para visualizar logs.</p>
                ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum log correlato encontrado.</p>
                ) : (
                    <div className="space-y-2">
                        {logs.map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono text-foreground">{entry.action}</span>
                                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                                </div>
                                <p className="mt-1 text-sm text-foreground">{entry.message}</p>
                                <Link href={`/admin/logs/${entry.id}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                                    Abrir detalhe do log
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

