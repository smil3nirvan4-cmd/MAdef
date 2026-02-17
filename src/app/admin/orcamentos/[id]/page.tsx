'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface OrcamentoDetalhe {
    id: string;
    status: string;
    cenarioEconomico?: string | null;
    cenarioRecomendado?: string | null;
    cenarioPremium?: string | null;
    cenarioSelecionado?: string | null;
    valorFinal?: number | null;
    enviadoEm?: string | null;
    aceitoEm?: string | null;
    createdAt: string;
    paciente: {
        id: string;
        nome?: string | null;
        telefone: string;
        cidade?: string | null;
        bairro?: string | null;
    };
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    RASCUNHO: 'default',
    APROVADO: 'info',
    ENVIADO: 'warning',
    PROPOSTA_ENVIADA: 'purple',
    CONTRATO_ENVIADO: 'purple',
    ACEITO: 'success',
    RECUSADO: 'error',
    CANCELADO: 'error',
};

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
}

export default function OrcamentoDetalhePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function fetchOrcamento() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/orcamentos/${params.id}`);
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload?.success) {
                setError(payload?.error || 'Falha ao carregar orcamento.');
                setOrcamento(null);
                return;
            }

            setOrcamento(payload.orcamento || null);
        } catch {
            setError('Falha ao carregar orcamento.');
            setOrcamento(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrcamento();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    async function openPdf(endpoint: 'gerar-proposta' | 'gerar-contrato') {
        setActionLoading(endpoint);
        try {
            const response = await fetch(`/api/admin/orcamentos/${params.id}/${endpoint}`, { method: 'POST' });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                setError(payload?.error || 'Falha ao gerar PDF.');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } finally {
            setActionLoading(null);
        }
    }

    async function runAction(action: 'enviar-proposta' | 'enviar-contrato' | 'aceitar' | 'cancelar') {
        setActionLoading(action);
        setError(null);

        try {
            let url = `/api/admin/orcamentos/${params.id}`;
            let method: 'PATCH' | 'POST' = 'PATCH';
            let body: any = {};

            if (action === 'enviar-proposta') {
                url = `/api/admin/orcamentos/${params.id}/enviar-proposta`;
                method = 'POST';
            } else if (action === 'enviar-contrato') {
                url = `/api/admin/orcamentos/${params.id}/enviar-contrato`;
                method = 'POST';
            } else {
                body = { action };
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'PATCH' ? JSON.stringify(body) : undefined,
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload?.success === false) {
                setError(payload?.error || 'Falha ao executar acao.');
                return;
            }

            await fetchOrcamento();
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando...</div>;
    }

    if (!orcamento) {
        return (
            <div className="p-8">
                <Card>
                    <p className="text-red-600">{error || 'Orcamento nao encontrado.'}</p>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={fetchOrcamento}>
                            <RefreshCw className="h-4 w-4" />
                            Tentar novamente
                        </Button>
                        <Link href="/admin/orcamentos">
                            <Button>Voltar</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={`Orcamento ${orcamento.id}`}
                description={`Paciente: ${orcamento.paciente?.nome || 'Sem nome'}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Orcamentos', href: '/admin/orcamentos' },
                    { label: 'Detalhe' },
                ]}
                actions={(
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchOrcamento} isLoading={loading}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Link href="/admin/orcamentos">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                )}
            />

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <h3 className="mb-3 font-semibold">Resumo</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status</span>
                            <Badge variant={STATUS_VARIANT[orcamento.status] || 'default'}>{orcamento.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Valor Final</span>
                            <span className="font-medium">{formatCurrency(orcamento.valorFinal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Criado em</span>
                            <span>{formatDate(orcamento.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Enviado em</span>
                            <span>{formatDate(orcamento.enviadoEm)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Aceito em</span>
                            <span>{formatDate(orcamento.aceitoEm)}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="mb-3 font-semibold">Paciente</h3>
                    <div className="space-y-2 text-sm">
                        <p><strong>Nome:</strong> {orcamento.paciente?.nome || 'Sem nome'}</p>
                        <p><strong>Telefone:</strong> {orcamento.paciente?.telefone}</p>
                        <p><strong>Cidade:</strong> {orcamento.paciente?.cidade || '-'}</p>
                        <p><strong>Bairro:</strong> {orcamento.paciente?.bairro || '-'}</p>
                    </div>
                </Card>

                <Card>
                    <h3 className="mb-3 font-semibold">Acoes</h3>
                    <div className="space-y-2">
                        <Button className="w-full justify-start" onClick={() => openPdf('gerar-proposta')} isLoading={actionLoading === 'gerar-proposta'}>
                            <FileText className="h-4 w-4" />
                            Preview Proposta (PDF)
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => openPdf('gerar-contrato')} isLoading={actionLoading === 'gerar-contrato'}>
                            <FileText className="h-4 w-4" />
                            Preview Contrato (PDF)
                        </Button>
                        <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700" onClick={() => runAction('enviar-proposta')} isLoading={actionLoading === 'enviar-proposta'}>
                            <Send className="h-4 w-4" />
                            Enviar Proposta (Outbox)
                        </Button>
                        <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700" onClick={() => runAction('enviar-contrato')} isLoading={actionLoading === 'enviar-contrato'}>
                            <Send className="h-4 w-4" />
                            Enviar Contrato (Outbox)
                        </Button>
                        <Button className="w-full justify-start bg-green-600 hover:bg-green-700" onClick={() => runAction('aceitar')} isLoading={actionLoading === 'aceitar'}>
                            <CheckCircle className="h-4 w-4" />
                            Marcar como Aceito
                        </Button>
                        <Button className="w-full justify-start" variant="danger" onClick={() => runAction('cancelar')} isLoading={actionLoading === 'cancelar'}>
                            <XCircle className="h-4 w-4" />
                            Cancelar Orcamento
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="mt-6">
                <h3 className="mb-3 font-semibold">Cenarios</h3>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Economico</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioEconomico || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Recomendado</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioRecomendado || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Premium</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioPremium || '-'}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

