'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, MessageCircle, FileText, Send, ArrowRight, CheckCircle2,
    Phone, MapPin, Clock, Edit, User, Calendar, Activity, ClipboardList,
    FileSignature, Home, AlertCircle
} from 'lucide-react';

interface Lead {
    id: string;
    nome: string;
    telefone: string;
    cidade?: string;
    bairro?: string;
    tipo: string;
    status: string;
    prioridade: string;
    hospital?: string;
    quarto?: string;
    createdAt: string;
    updatedAt: string;
    mensagens?: Array<{ id: string; conteudo: string; direcao: string; timestamp: string; flow?: string; step?: string; }>;
    avaliacoes?: Array<{ id: string; status: string; createdAt: string; dadosDetalhados?: string; valorProposto?: string; whatsappEnviado?: boolean; whatsappEnviadoEm?: string; }>;
    orcamentos?: Array<{ id: string; status: string; valorFinal: number; createdAt: string; cenarioEconomico?: string; cenarioRecomendado?: string; cenarioPremium?: string; }>;
    formSubmissions?: Array<{ id: string; tipo: string; dados: string; createdAt: string; }>;
    alocacoes?: Array<{ id: string; status: string; turno: string; diaSemana: number; dataInicio: string; cuidador?: { nome?: string; telefone: string; } }>;
}

// ====================================
// ETAPAS DO FLUXO DE ATENDIMENTO
// ====================================
const FLOW_STAGES = [
    { key: 'PENDENTE', label: 'Pendente', icon: Clock, color: 'gray', statuses: ['LEAD'] },
    { key: 'EM_ANALISE', label: 'Em Análise', icon: ClipboardList, color: 'blue', statuses: ['EM_AVALIACAO', 'AVALIACAO'] },
    { key: 'PROPOSTA', label: 'Proposta', icon: Send, color: 'purple', statuses: ['PROPOSTA_ENVIADA', 'PROPOSTA_ACEITA', 'PROPOSTA_RECUSADA'] },
    { key: 'CONTRATO', label: 'Contrato', icon: FileSignature, color: 'yellow', statuses: ['AGUARDANDO_CONTRATO', 'CONTRATO_ENVIADO'] },
    { key: 'APROVADA', label: 'Aprovada', icon: CheckCircle2, color: 'green', statuses: ['ATIVO'] },
    { key: 'CONCLUIDA', label: 'Concluída', icon: Home, color: 'emerald', statuses: ['CONCLUIDO', 'FINALIZADO'] },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; stage: string }> = {
    LEAD: { label: 'Pendente', variant: 'default', stage: 'PENDENTE' },
    EM_AVALIACAO: { label: 'Em Análise', variant: 'info', stage: 'EM_ANALISE' },
    AVALIACAO: { label: 'Em Análise', variant: 'info', stage: 'EM_ANALISE' },
    PROPOSTA_ENVIADA: { label: 'Proposta Enviada', variant: 'purple', stage: 'PROPOSTA' },
    PROPOSTA_ACEITA: { label: 'Proposta Aceita', variant: 'success', stage: 'PROPOSTA' },
    PROPOSTA_RECUSADA: { label: 'Proposta Recusada', variant: 'error', stage: 'PROPOSTA' },
    AGUARDANDO_CONTRATO: { label: 'Aguardando Contrato', variant: 'warning', stage: 'CONTRATO' },
    CONTRATO_ENVIADO: { label: 'Contrato Enviado', variant: 'warning', stage: 'CONTRATO' },
    ATIVO: { label: 'Cliente Ativo', variant: 'success', stage: 'APROVADA' },
    CONCLUIDO: { label: 'Concluído', variant: 'success', stage: 'CONCLUIDA' },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'error' }> = {
    NORMAL: { label: 'Normal', variant: 'default' },
    ALTA: { label: 'Alta', variant: 'warning' },
    URGENTE: { label: 'Urgente', variant: 'error' },
};

function getCurrentStageIndex(status: string): number {
    const config = STATUS_CONFIG[status];
    if (!config) return 0;
    return FLOW_STAGES.findIndex(s => s.key === config.stage);
}

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await fetch(`/api/admin/pacientes/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setLead(data.data?.paciente ?? data.paciente);
            } else {
                setFetchError(`Erro ao carregar lead (HTTP ${res.status})`);
            }
        } catch (error) {
            setFetchError(error instanceof Error ? error.message : 'Erro de conexão ao carregar lead');
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) fetchData();
    }, [params.id, fetchData]);

    const handleAction = async (action: string, newStatus?: string) => {
        if (!lead) return;
        setActionLoading(action);

        try {
            if (action === 'whatsapp') {
                window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
            } else if (action === 'avaliar') {
                router.push(`/admin/avaliacoes/nova?pacienteId=${lead.id}`);
            } else if (newStatus) {
                const res = await fetch(`/api/admin/pacientes/${lead.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (res.ok) {
                    fetchData();
                }
            }
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando detalhes do lead...</div>;
    if (fetchError) return (
        <div className="p-8 text-center">
            <p className="text-error-500 mb-4">{fetchError}</p>
            <button onClick={fetchData} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Tentar novamente</button>
        </div>
    );
    if (!lead) return <div className="p-8 text-center text-error-500">Lead não encontrado</div>;

    const st = STATUS_CONFIG[lead.status] || { label: lead.status, variant: 'default', stage: 'PENDENTE' };
    const pr = PRIORIDADE_CONFIG[lead.prioridade] || { label: lead.prioridade, variant: 'default' };
    const currentStageIndex = getCurrentStageIndex(lead.status);

    // Parse dados da avaliação se existir
    let avaliacaoData: Record<string, unknown> | null = null;
    if (lead.avaliacoes?.[0]?.dadosDetalhados) {
        try {
            avaliacaoData = JSON.parse(lead.avaliacoes[0].dadosDetalhados);
        } catch { /* ignore */ }
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                title={lead.nome || 'Lead sem nome'}
                description={`Cadastrado em ${new Date(lead.createdAt).toLocaleDateString('pt-BR')} às ${new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Leads', href: '/admin/leads' },
                    { label: lead.nome || 'Detalhes' }
                ]}
                actions={
                    <Link href="/admin/leads">
                        <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    </Link>
                }
            />

            {/* ====================================
                TIMELINE DO FLUXO DE ATENDIMENTO
            ==================================== */}
            <Card className="!p-6">
                <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Fluxo do Atendimento
                </h3>
                <div className="flex items-center justify-between relative">
                    {/* Progress bar background */}
                    <div className="absolute left-0 right-0 top-6 h-1 bg-neutral-200 rounded" />
                    {/* Progress bar fill */}
                    <div
                        className="absolute left-0 top-6 h-1 bg-primary-500 rounded transition-all duration-500"
                        style={{ width: `${(currentStageIndex / (FLOW_STAGES.length - 1)) * 100}%` }}
                    />

                    {FLOW_STAGES.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isCompleted = idx < currentStageIndex;
                        const isCurrent = idx === currentStageIndex;
                        const isPending = idx > currentStageIndex;

                        return (
                            <div key={stage.key} className="relative z-10 flex flex-col items-center">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                                    ${isCompleted ? 'bg-secondary-500 border-secondary-500 text-white' : ''}
                                    ${isCurrent ? 'bg-primary-500 border-primary-500 text-white ring-4 ring-blue-100' : ''}
                                    ${isPending ? 'bg-card border-border-hover text-muted-foreground' : ''}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={`
                                    mt-2 text-xs font-medium text-center
                                    ${isCurrent ? 'text-primary' : isCompleted ? 'text-secondary-600' : 'text-muted-foreground'}
                                `}>
                                    {stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 text-center">
                    <Badge variant={st.variant} className="text-sm px-3 py-1">{st.label}</Badge>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ====================================
                    INFORMAÇÕES DO LEAD
                ==================================== */}
                <Card className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Informações do Cliente
                            </h3>
                        </div>
                        <Badge variant={pr.variant}>{pr.label}</Badge>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{lead.nome || 'Nome não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{lead.telefone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>
                                {lead.cidade || 'Cidade N/A'}
                                {lead.bairro && `, ${lead.bairro}`}
                            </span>
                        </div>
                        {lead.hospital && (
                            <div className="flex items-center gap-3 text-sm">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <span>{lead.hospital} {lead.quarto && `- Quarto ${lead.quarto}`}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Tipo: <Badge variant="info" className="ml-1">{lead.tipo || 'HOME_CARE'}</Badge></span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('whatsapp')}>
                            <MessageCircle className="w-4 h-4 mr-2 text-secondary-600" /> Abrir WhatsApp
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('avaliar')}>
                            <ClipboardList className="w-4 h-4 mr-2 text-primary" /> Iniciar Avaliação
                        </Button>
                    </div>
                </Card>

                {/* ====================================
                    DADOS DA AVALIAÇÃO (se existir)
                ==================================== */}
                <Card className="space-y-4">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-accent-600" />
                        Dados da Avaliação
                    </h3>

                    {!lead.avaliacoes?.length ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                            <p>Nenhuma avaliação realizada</p>
                            <Button variant="primary" className="mt-4" onClick={() => handleAction('avaliar')}>
                                <Edit className="w-4 h-4 mr-2" /> Iniciar Avaliação
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {avaliacaoData && (
                                <>
                                    {/* Discovery */}
                                    {(avaliacaoData as Record<string, Record<string, string>>).discovery && (
                                        <div className="p-3 bg-info-50 rounded-lg">
                                            <p className="text-xs font-medium text-primary mb-1">Gatilho / Motivação</p>
                                            <p className="text-sm">{(avaliacaoData as Record<string, Record<string, string>>).discovery?.gatilho || 'N/A'}</p>
                                        </div>
                                    )}

                                    {/* Patient Info */}
                                    {(avaliacaoData as Record<string, Record<string, string>>).patient && (
                                        <div className="p-3 bg-accent-500/10 rounded-lg">
                                            <p className="text-xs font-medium text-accent-700 mb-1">Paciente</p>
                                            <p className="text-sm">Idade: {(avaliacaoData as Record<string, Record<string, string>>).patient?.idade || 'N/A'}</p>
                                            <p className="text-sm">Peso: {(avaliacaoData as Record<string, Record<string, string>>).patient?.peso || 'N/A'} kg</p>
                                        </div>
                                    )}

                                    {/* Clinical */}
                                    {(avaliacaoData as Record<string, Record<string, unknown>>).clinical && (
                                        <div className="p-3 bg-success-50 rounded-lg">
                                            <p className="text-xs font-medium text-secondary-700 mb-1">Dados Clínicos</p>
                                            <p className="text-sm">Medicamentos: {((avaliacaoData as Record<string, Record<string, Record<string, string>>>).clinical?.medicamentos)?.total || 'N/A'}</p>
                                            <p className="text-sm">Quedas: {(avaliacaoData as Record<string, Record<string, string>>).clinical?.quedas || 'N/A'}</p>
                                        </div>
                                    )}

                                    {/* Valor Proposto */}
                                    {lead.avaliacoes[0].valorProposto && (
                                        <div className="p-3 bg-warning-50 rounded-lg">
                                            <p className="text-xs font-medium text-warning-600 mb-1">Valor Proposto</p>
                                            <p className="text-lg font-bold text-warning-600">R$ {lead.avaliacoes[0].valorProposto}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="pt-2 border-t text-xs text-muted-foreground">
                                Última avaliação: {new Date(lead.avaliacoes[0].createdAt).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    )}
                </Card>

                {/* ====================================
                    AÇÕES DO FLUXO
                ==================================== */}
                <Card className="space-y-4">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-secondary-600" />
                        Ações
                    </h3>

                    <div className="space-y-3">
                        {/* Avançar para Em Análise */}
                        {lead.status === 'LEAD' && (
                            <Button
                                className="w-full justify-start"
                                variant="outline"
                                onClick={() => handleAction('status', 'EM_AVALIACAO')}
                                isLoading={actionLoading === 'status'}
                            >
                                <ClipboardList className="w-4 h-4 mr-2 text-primary" />
                                Iniciar Análise
                            </Button>
                        )}

                        {/* Enviar Proposta */}
                        {['EM_AVALIACAO', 'AVALIACAO'].includes(lead.status) && (
                            <Link href={`/admin/avaliacoes/nova?pacienteId=${lead.id}`} className="block">
                                <Button className="w-full justify-start" variant="outline">
                                    <Send className="w-4 h-4 mr-2 text-accent-600" />
                                    Realizar Avaliação e Enviar Proposta
                                </Button>
                            </Link>
                        )}

                        {/* Aguardando resposta da proposta */}
                        {lead.status === 'PROPOSTA_ENVIADA' && (
                            <div className="p-4 bg-accent-500/10 rounded-lg text-center">
                                <Send className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                <p className="text-sm text-accent-700 font-medium">Aguardando resposta do cliente</p>
                                <p className="text-xs text-accent-600 mt-1">O cliente deve responder &quot;Confirmo&quot; ou &quot;Recuso&quot;</p>
                            </div>
                        )}

                        {/* Proposta Aceita - Enviar Contrato */}
                        {lead.status === 'PROPOSTA_ACEITA' && (
                            <Button
                                className="w-full justify-start"
                                variant="primary"
                                onClick={() => handleAction('status', 'CONTRATO_ENVIADO')}
                                isLoading={actionLoading === 'status'}
                            >
                                <FileSignature className="w-4 h-4 mr-2" />
                                Enviar Contrato para Assinatura
                            </Button>
                        )}

                        {/* Proposta Recusada */}
                        {lead.status === 'PROPOSTA_RECUSADA' && (
                            <div className="p-4 bg-error-50 rounded-lg text-center">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-error-500" />
                                <p className="text-sm text-error-700 font-medium">Proposta Recusada</p>
                                <Button
                                    className="mt-3"
                                    variant="outline"
                                    onClick={() => handleAction('status', 'EM_AVALIACAO')}
                                >
                                    Reavaliar Cliente
                                </Button>
                            </div>
                        )}

                        {/* Contrato Enviado - Aguardando Assinatura */}
                        {['AGUARDANDO_CONTRATO', 'CONTRATO_ENVIADO'].includes(lead.status) && (
                            <div className="space-y-3">
                                <div className="p-4 bg-warning-50 rounded-lg text-center">
                                    <FileSignature className="w-8 h-8 mx-auto mb-2 text-warning-500" />
                                    <p className="text-sm text-warning-600 font-medium">Aguardando assinatura</p>
                                </div>
                                <Button
                                    className="w-full justify-start"
                                    variant="primary"
                                    onClick={() => handleAction('status', 'ATIVO')}
                                    isLoading={actionLoading === 'status'}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirmar Assinatura e Ativar Cliente
                                </Button>
                            </div>
                        )}

                        {/* Cliente Ativo */}
                        {lead.status === 'ATIVO' && (
                            <div className="p-4 bg-success-50 rounded-lg text-center">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success-500" />
                                <p className="text-sm text-secondary-700 font-medium">Cliente Ativo</p>
                                <p className="text-xs text-secondary-600 mt-1">Atendimento em andamento</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ====================================
                HISTÓRICO DE MENSAGENS
            ==================================== */}
            <Card>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-secondary-600" />
                    Histórico de Conversas WhatsApp ({lead.mensagens?.length || 0} mensagens)
                </h3>

                {!lead.mensagens?.length ? (
                    <p className="text-sm text-muted-foreground italic text-center py-8">Nenhuma mensagem registrada.</p>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {lead.mensagens.map(msg => (
                            <div
                                key={msg.id}
                                className={`p-3 rounded-lg text-sm ${msg.direcao === 'IN'
                                    ? 'bg-surface-subtle mr-12'
                                    : 'bg-success-100 ml-12'
                                    }`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <p className="flex-1 whitespace-pre-wrap">{msg.conteudo}</p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(msg.timestamp).toLocaleDateString('pt-BR')} {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {(msg.flow || msg.step) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {msg.flow && `Fluxo: ${msg.flow}`} {msg.step && `| Etapa: ${msg.step}`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* ====================================
                HISTÓRICO DE AVALIAÇÕES COMPLETO
            ==================================== */}
            {lead.avaliacoes && lead.avaliacoes.length > 0 && (
                <Card>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-accent-600" />
                        Histórico de Avaliações Completo ({lead.avaliacoes.length})
                    </h3>
                    <div className="space-y-6">
                        {lead.avaliacoes.map((av, idx) => {
                            let dados: Record<string, unknown> | null = null;
                            try {
                                if (av.dadosDetalhados) dados = JSON.parse(av.dadosDetalhados);
                            } catch { /* ignore */ }

                            // Função para renderizar dados recursivamente
                            const renderData = (obj: Record<string, unknown>, prefix = ''): React.ReactNode[] => {
                                const items: React.ReactNode[] = [];
                                Object.entries(obj).forEach(([key, value]) => {
                                    const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                                    if (value === null || value === undefined || value === '') return;

                                    if (typeof value === 'object' && !Array.isArray(value)) {
                                        items.push(
                                            <div key={`${prefix}${key}`} className="col-span-2 mt-2">
                                                <p className="font-semibold text-foreground capitalize border-b pb-1 mb-2">{label}</p>
                                                <div className="grid grid-cols-2 gap-2 pl-2">
                                                    {renderData(value as Record<string, unknown>, `${prefix}${key}.`)}
                                                </div>
                                            </div>
                                        );
                                    } else if (Array.isArray(value)) {
                                        items.push(
                                            <div key={`${prefix}${key}`} className="col-span-2">
                                                <span className="text-xs text-muted-foreground capitalize">{label}:</span>
                                                <p className="text-sm">{value.join(', ')}</p>
                                            </div>
                                        );
                                    } else {
                                        items.push(
                                            <div key={`${prefix}${key}`} className="p-2 bg-background rounded">
                                                <span className="text-xs text-muted-foreground capitalize block">{label}:</span>
                                                <p className="text-sm font-medium">{String(value)}</p>
                                            </div>
                                        );
                                    }
                                });
                                return items;
                            };

                            return (
                                <div key={av.id} className="border-2 rounded-xl p-5 bg-card shadow-sm">
                                    {/* Header da Avaliação */}
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b">
                                        <div>
                                            <span className="font-bold text-lg">Avaliação #{lead.avaliacoes!.length - idx}</span>
                                            <p className="text-xs text-muted-foreground">ID: {av.id}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant={av.status === 'ENVIADA' ? 'success' : av.status === 'PENDENTE' ? 'warning' : 'info'}>
                                                {av.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(av.createdAt).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Valor Proposto */}
                                    {av.valorProposto && (
                                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg mb-4 border-l-4 border-warning-500">
                                            <p className="text-sm text-warning-600">Valor Proposto</p>
                                            <p className="text-2xl font-bold text-yellow-900">R$ {av.valorProposto}</p>
                                        </div>
                                    )}

                                    {/* Status de Envio WhatsApp */}
                                    {av.whatsappEnviado && (
                                        <div className="p-3 bg-success-50 rounded-lg text-sm text-secondary-700 mb-4 flex items-center gap-2">
                                            <MessageCircle className="w-4 h-4" />
                                            Proposta enviada via WhatsApp em {av.whatsappEnviadoEm ? new Date(av.whatsappEnviadoEm).toLocaleString('pt-BR') : 'data não registrada'}
                                        </div>
                                    )}

                                    {/* TODOS OS DADOS COLETADOS */}
                                    {dados && (
                                        <div className="space-y-4">
                                            <p className="font-semibold text-foreground text-sm uppercase tracking-wide">Dados Completos da Avaliacao:</p>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                {renderData(dados as Record<string, unknown>)}
                                            </div>
                                        </div>
                                    )}

                                    {/* JSON Raw para debug se necessário */}
                                    {dados && (
                                        <details className="mt-4">
                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                                Ver dados brutos (JSON)
                                            </summary>
                                            <pre className="mt-2 p-3 bg-neutral-900 text-success-500 rounded text-xs overflow-auto max-h-48">
                                                {JSON.stringify(dados, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* ====================================
                ORÇAMENTOS
            ==================================== */}
            {lead.orcamentos && lead.orcamentos.length > 0 && (
                <Card>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Orçamentos ({lead.orcamentos.length})
                    </h3>
                    <div className="space-y-3">
                        {lead.orcamentos.map(orc => (
                            <div key={orc.id} className="border rounded-lg p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-medium">R$ {orc.valorFinal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(orc.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <Badge variant={orc.status === 'APROVADO' ? 'success' : orc.status === 'RECUSADO' ? 'error' : 'warning'}>
                                    {orc.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ====================================
                DADOS DE FORMULÁRIOS (SITE)
            ==================================== */}
            {lead.formSubmissions && lead.formSubmissions.length > 0 && (
                <Card>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Edit className="w-5 h-5 text-info-600" />
                        Formulários Recebidos (Site) ({lead.formSubmissions.length})
                    </h3>
                    <div className="space-y-3">
                        {lead.formSubmissions.map(form => {
                            let dados: Record<string, unknown> | null = null;
                            try {
                                dados = JSON.parse(form.dados);
                            } catch { /* ignore */ }

                            return (
                                <div key={form.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <Badge variant="info">{form.tipo}</Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(form.createdAt).toLocaleString('pt-BR')}</span>
                                    </div>
                                    {dados && (
                                        <div className="text-sm space-y-1">
                                            {Object.entries(dados).slice(0, 8).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                                    <span>{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
