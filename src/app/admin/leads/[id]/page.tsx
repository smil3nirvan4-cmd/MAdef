'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, MessageCircle, FileText, Send, ArrowRight,
    Phone, MapPin, Clock, Edit, MoreVertical
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
    observacoes?: string;
    createdAt: string;
    mensagens?: Array<{ id: string; conteudo: string; direcao: string; timestamp: string; type: string; }>;
    avaliacoes?: Array<{ id: string; status: string; createdAt: string; }>;
    orcamentos?: Array<{ id: string; status: string; valorTotal: number; createdAt: string; }>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }> = {
    LEAD: { label: 'Novo Lead', variant: 'default' },
    AVALIACAO: { label: 'Em Avaliação', variant: 'info' },
    PROPOSTA_ENVIADA: { label: 'Proposta Enviada', variant: 'purple' },
    CONTRATO_ENVIADO: { label: 'Contrato Enviado', variant: 'warning' },
    ATIVO: { label: 'Paciente Ativo', variant: 'success' },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'error' }> = {
    NORMAL: { label: 'Normal', variant: 'default' },
    ALTA: { label: 'Alta', variant: 'warning' },
    URGENTE: { label: 'Urgente', variant: 'error' },
};

export default function LeadDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Reusing the pacientes endpoint as Leads are stored in the same table
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

    const handleAction = async (action: string) => {
        if (!lead) return;
        setActionLoading(action);

        try {
            if (action === 'whatsapp') {
                window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank');
            } else if (action === 'avaliar') {
                router.push(`/admin/avaliacoes/nova?pacienteId=${lead.id}`);
            } else {
                // Update status actions
                let newStatus = lead.status;
                if (action === 'enviar_proposta') newStatus = 'PROPOSTA_ENVIADA';
                if (action === 'enviar_contrato') newStatus = 'CONTRATO_ENVIADO';
                if (action === 'converter') newStatus = 'ATIVO';

                const res = await fetch(`/api/admin/pacientes/${lead.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });

                if (res.ok) {
                    fetchData();
                    if (newStatus === 'ATIVO') {
                        // Redirect to patients list or stay? 
                        // Maybe show success message
                    }
                }
            }
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes do lead...</div>;
    if (!lead) return <div className="p-8 text-center text-red-500">Lead não encontrado</div>;

    const st = STATUS_CONFIG[lead.status] || { label: lead.status, variant: 'default' };
    const pr = PRIORIDADE_CONFIG[lead.prioridade] || { label: lead.prioridade, variant: 'default' };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                title={lead.nome}
                description={`Lead cadastrado em ${new Date(lead.createdAt).toLocaleDateString('pt-BR')}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Leads', href: '/admin/leads' },
                    { label: lead.nome }
                ]}
                actions={
                    <Link href="/admin/leads">
                        <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    </Link>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Card */}
                <Card className="lg:col-span-1 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-900">Informações</h3>
                            <p className="text-sm text-gray-500">Dados cadastrais</p>
                        </div>
                        <Badge variant={st.variant}>{st.label}</Badge>
                    </div>

                    <div className="space-y-3 pt-2">
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
                                <i className="w-4 h-4 text-gray-400">🏥</i>
                                <span>{lead.hospital} {lead.quarto && `- Quarto ${lead.quarto}`}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>Prioridade: <Badge variant={pr.variant} className="ml-1 text-xs">{pr.label}</Badge></span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('whatsapp')}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> WhatsApp
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('avaliar')}>
                            <Edit className="w-4 h-4 mr-2 text-blue-600" /> Realizar Avaliação
                        </Button>
                    </div>
                </Card>

                {/* Workflow Actions */}
                <Card className="lg:col-span-2">
                    <h3 className="font-semibold text-lg mb-4">Fluxo de Conversão</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            variant={lead.status === 'PROPOSTA_ENVIADA' ? 'default' : 'outline'}
                            className={`h-auto py-4 flex flex-col gap-2 ${lead.status === 'PROPOSTA_ENVIADA' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' : ''}`}
                            onClick={() => handleAction('enviar_proposta')}
                            isLoading={actionLoading === 'enviar_proposta'}
                        >
                            <Send className={`w-6 h-6 ${lead.status === 'PROPOSTA_ENVIADA' ? 'text-purple-600' : 'text-gray-400'}`} />
                            <span className="font-semibold">Enviar Proposta</span>
                            <span className="text-xs font-normal opacity-75">Marcar como enviada</span>
                        </Button>

                        <Button
                            variant={lead.status === 'CONTRATO_ENVIADO' ? 'default' : 'outline'}
                            className={`h-auto py-4 flex flex-col gap-2 ${lead.status === 'CONTRATO_ENVIADO' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : ''}`}
                            onClick={() => handleAction('enviar_contrato')}
                            isLoading={actionLoading === 'enviar_contrato'}
                        >
                            <FileText className={`w-6 h-6 ${lead.status === 'CONTRATO_ENVIADO' ? 'text-yellow-600' : 'text-gray-400'}`} />
                            <span className="font-semibold">Enviar Contrato</span>
                            <span className="text-xs font-normal opacity-75">Aguardando assinatura</span>
                        </Button>

                        <Button
                            variant={lead.status === 'ATIVO' ? 'default' : 'outline'}
                            className={`h-auto py-4 flex flex-col gap-2 ${lead.status === 'ATIVO' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : ''}`}
                            onClick={() => handleAction('converter')}
                            isLoading={actionLoading === 'converter'}
                        >
                            <ArrowRight className={`w-6 h-6 ${lead.status === 'ATIVO' ? 'text-green-600' : 'text-gray-400'}`} />
                            <span className="font-semibold">Converter</span>
                            <span className="text-xs font-normal opacity-75">Tornar Paciente Ativo</span>
                        </Button>
                    </div>

                    <div className="mt-8">
                        <h4 className="font-medium text-sm text-gray-700 mb-3">Histórico de Atividades</h4>
                        <div className="space-y-3">
                            {(!lead.mensagens?.length && !lead.avaliacoes?.length) && (
                                <p className="text-sm text-gray-500 italic">Nenhuma atividade registrada.</p>
                            )}

                            {/* Simple combined feed simulation */}
                            {lead.avaliacoes?.slice(0, 3).map(av => (
                                <div key={av.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm border-l-4 border-blue-500">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">Avaliação Realizada</p>
                                        <p className="text-xs text-gray-500">{new Date(av.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <Badge variant="info">{av.status}</Badge>
                                </div>
                            ))}

                            {lead.orcamentos?.slice(0, 3).map(orc => (
                                <div key={orc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm border-l-4 border-purple-500">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">Orçamento Gerado</p>
                                        <p className="text-xs text-gray-500">{new Date(orc.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <span className="font-medium text-gray-900">R$ {orc.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
