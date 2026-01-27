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
    avaliacoes?: Array<{ id: string; status: string; createdAt: string; dadosDetalhados?: string; valorProposto?: string; }>;
    orcamentos?: Array<{ id: string; status: string; valorFinal: number; createdAt: string; }>;
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
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/pacientes/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setLead(data.paciente);
            } else {
                console.error('Failed to fetch lead');
            }
        } catch (error) {
            console.error('Error fetching lead:', error);
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
                window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank');
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

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes do lead...</div>;
    if (!lead) return <div className="p-8 text-center text-red-500">Lead não encontrado</div>;

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
                    <Activity className="w-5 h-5 text-blue-600" />
                    Fluxo do Atendimento
                </h3>
                <div className="flex items-center justify-between relative">
                    {/* Progress bar background */}
                    <div className="absolute left-0 right-0 top-6 h-1 bg-gray-200 rounded" />
                    {/* Progress bar fill */}
                    <div
                        className="absolute left-0 top-6 h-1 bg-blue-500 rounded transition-all duration-500"
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
                                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                                    ${isCurrent ? 'bg-blue-500 border-blue-500 text-white ring-4 ring-blue-100' : ''}
                                    ${isPending ? 'bg-white border-gray-300 text-gray-400' : ''}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={`
                                    mt-2 text-xs font-medium text-center
                                    ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
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
                            <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Informações do Cliente
                            </h3>
                        </div>
                        <Badge variant={pr.variant}>{pr.label}</Badge>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{lead.nome || 'Nome não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{lead.telefone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>
                                {lead.cidade || 'Cidade N/A'}
                                {lead.bairro && `, ${lead.bairro}`}
                            </span>
                        </div>
                        {lead.hospital && (
                            <div className="flex items-center gap-3 text-sm">
                                <Home className="w-4 h-4 text-gray-400" />
                                <span>{lead.hospital} {lead.quarto && `- Quarto ${lead.quarto}`}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Tipo: <Badge variant="info" className="ml-1">{lead.tipo || 'HOME_CARE'}</Badge></span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('whatsapp')}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> Abrir WhatsApp
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('avaliar')}>
                            <ClipboardList className="w-4 h-4 mr-2 text-blue-600" /> Iniciar Avaliação
                        </Button>
                    </div>
                </Card>

                {/* ====================================
                    DADOS DA AVALIAÇÃO (se existir)
                ==================================== */}
                <Card className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                        Dados da Avaliação
                    </h3>

                    {!lead.avaliacoes?.length ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <p className="text-xs font-medium text-blue-700 mb-1">Gatilho / Motivação</p>
                                            <p className="text-sm">{(avaliacaoData as Record<string, Record<string, string>>).discovery?.gatilho || 'N/A'}</p>
                                        </div>
                                    )}

                                    {/* Patient Info */}
                                    {(avaliacaoData as Record<string, Record<string, string>>).patient && (
                                        <div className="p-3 bg-purple-50 rounded-lg">
                                            <p className="text-xs font-medium text-purple-700 mb-1">Paciente</p>
                                            <p className="text-sm">Idade: {(avaliacaoData as Record<string, Record<string, string>>).patient?.idade || 'N/A'}</p>
                                            <p className="text-sm">Peso: {(avaliacaoData as Record<string, Record<string, string>>).patient?.peso || 'N/A'} kg</p>
                                        </div>
                                    )}

                                    {/* Clinical */}
                                    {(avaliacaoData as Record<string, Record<string, unknown>>).clinical && (
                                        <div className="p-3 bg-green-50 rounded-lg">
                                            <p className="text-xs font-medium text-green-700 mb-1">Dados Clínicos</p>
                                            <p className="text-sm">Medicamentos: {((avaliacaoData as Record<string, Record<string, Record<string, string>>>).clinical?.medicamentos)?.total || 'N/A'}</p>
                                            <p className="text-sm">Quedas: {(avaliacaoData as Record<string, Record<string, string>>).clinical?.quedas || 'N/A'}</p>
                                        </div>
                                    )}

                                    {/* Valor Proposto */}
                                    {lead.avaliacoes[0].valorProposto && (
                                        <div className="p-3 bg-yellow-50 rounded-lg">
                                            <p className="text-xs font-medium text-yellow-700 mb-1">Valor Proposto</p>
                                            <p className="text-lg font-bold text-yellow-800">R$ {lead.avaliacoes[0].valorProposto}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="pt-2 border-t text-xs text-gray-500">
                                Última avaliação: {new Date(lead.avaliacoes[0].createdAt).toLocaleString('pt-BR')}
                            </div>
                        </div>
                    )}
                </Card>

                {/* ====================================
                    AÇÕES DO FLUXO
                ==================================== */}
                <Card className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-green-600" />
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
                                <ClipboardList className="w-4 h-4 mr-2 text-blue-600" />
                                Iniciar Análise
                            </Button>
                        )}

                        {/* Enviar Proposta */}
                        {['EM_AVALIACAO', 'AVALIACAO'].includes(lead.status) && (
                            <Link href={`/admin/avaliacoes/nova?pacienteId=${lead.id}`} className="block">
                                <Button className="w-full justify-start" variant="outline">
                                    <Send className="w-4 h-4 mr-2 text-purple-600" />
                                    Realizar Avaliação e Enviar Proposta
                                </Button>
                            </Link>
                        )}

                        {/* Aguardando resposta da proposta */}
                        {lead.status === 'PROPOSTA_ENVIADA' && (
                            <div className="p-4 bg-purple-50 rounded-lg text-center">
                                <Send className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                                <p className="text-sm text-purple-700 font-medium">Aguardando resposta do cliente</p>
                                <p className="text-xs text-purple-600 mt-1">O cliente deve responder &quot;Confirmo&quot; ou &quot;Recuso&quot;</p>
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
                            <div className="p-4 bg-red-50 rounded-lg text-center">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                                <p className="text-sm text-red-700 font-medium">Proposta Recusada</p>
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
                                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                                    <FileSignature className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                    <p className="text-sm text-yellow-700 font-medium">Aguardando assinatura</p>
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
                            <div className="p-4 bg-green-50 rounded-lg text-center">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                <p className="text-sm text-green-700 font-medium">Cliente Ativo</p>
                                <p className="text-xs text-green-600 mt-1">Atendimento em andamento</p>
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
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    Histórico de Conversas WhatsApp
                </h3>

                {!lead.mensagens?.length ? (
                    <p className="text-sm text-gray-500 italic text-center py-8">Nenhuma mensagem registrada.</p>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {lead.mensagens.map(msg => (
                            <div
                                key={msg.id}
                                className={`p-3 rounded-lg text-sm ${msg.direcao === 'IN'
                                        ? 'bg-gray-100 mr-12'
                                        : 'bg-green-100 ml-12'
                                    }`}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <p className="flex-1">{msg.conteudo}</p>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {(msg.flow || msg.step) && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {msg.flow && `Fluxo: ${msg.flow}`} {msg.step && `| Etapa: ${msg.step}`}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
