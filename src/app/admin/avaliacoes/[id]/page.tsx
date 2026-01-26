'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, MessageCircle, FileText, Send, CheckCircle,
    XCircle, Trash2, User, Phone, MapPin, Clock, DollarSign
} from 'lucide-react';

interface Avaliacao {
    id: string;
    status: string;
    nivelSugerido?: string;
    cargaSugerida?: string;
    valorProposto?: string;
    whatsappEnviado: boolean;
    whatsappEnviadoEm?: string;
    whatsappErro?: string;
    createdAt: string;
    validadoEm?: string;
    dadosDetalhados?: string;
    paciente: {
        id: string;
        nome: string;
        telefone: string;
        cidade?: string;
        bairro?: string;
        mensagens: Array<{ id: string; conteudo: string; direcao: string; timestamp: string; }>;
        orcamentos: Array<{ id: string; status: string; valorFinal?: number; createdAt: string; }>;
    };
}

const STATUS_FLOW = [
    { key: 'PENDENTE', label: 'Pendente', icon: Clock },
    { key: 'EM_ANALISE', label: 'Em Análise', icon: FileText },
    { key: 'PROPOSTA_ENVIADA', label: 'Proposta', icon: Send },
    { key: 'CONTRATO_ENVIADO', label: 'Contrato', icon: FileText },
    { key: 'APROVADA', label: 'Aprovada', icon: CheckCircle },
    { key: 'CONCLUIDA', label: 'Concluída', icon: CheckCircle },
];

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    PENDENTE: 'warning', EM_ANALISE: 'info', PROPOSTA_ENVIADA: 'purple',
    CONTRATO_ENVIADO: 'purple', APROVADA: 'success', REJEITADA: 'error', CONCLUIDA: 'success',
};

export default function AvaliacaoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/avaliacoes/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setAvaliacao(data.avaliacao);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [params.id]);

    const handleAction = async (action: string) => {
        setActionLoading(action);
        try {
            if (action === 'whatsapp') {
                await fetch('/api/admin/avaliacoes/reenviar-whatsapp', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avaliacaoId: params.id }),
                });
            } else if (action === 'delete') {
                if (confirm('Excluir avaliação?')) {
                    await fetch(`/api/admin/avaliacoes/${params.id}`, { method: 'DELETE' });
                    router.push('/admin/avaliacoes');
                    return;
                }
            } else {
                await fetch(`/api/admin/avaliacoes/${params.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action }),
                });
            }
            fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const currentStepIndex = STATUS_FLOW.findIndex(s => s.key === avaliacao?.status);

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!avaliacao) return <div className="p-8 text-center text-red-500">Avaliação não encontrada</div>;

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={`Avaliação - ${avaliacao.paciente.nome}`}
                description={`ID: ${avaliacao.id}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Avaliações', href: '/admin/avaliacoes' },
                    { label: 'Detalhes' }
                ]}
                actions={<Link href="/admin/avaliacoes"><Button variant="outline"><ArrowLeft className="w-4 h-4" />Voltar</Button></Link>}
            />

            {/* Flow Timeline */}
            <Card className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Fluxo do Atendimento</h3>
                <div className="flex items-center justify-between">
                    {STATUS_FLOW.map((step, i) => {
                        const isActive = step.key === avaliacao.status;
                        const isPast = i < currentStepIndex;
                        const Icon = step.icon;
                        return (
                            <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPast ? 'bg-green-100' : isActive ? 'bg-blue-600' : 'bg-gray-100'}`}>
                                    <Icon className={`w-5 h-5 ${isPast ? 'text-green-600' : isActive ? 'text-white' : 'text-gray-400'}`} />
                                </div>
                                <span className={`text-xs mt-2 ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>{step.label}</span>
                                {i < STATUS_FLOW.length - 1 && (
                                    <div className={`absolute top-5 left-1/2 w-full h-0.5 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Patient Info */}
                <Card>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><User className="w-4 h-4" />Paciente</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span>{avaliacao.paciente.nome}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{avaliacao.paciente.telefone}</span></div>
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{avaliacao.paciente.cidade || 'N/A'}, {avaliacao.paciente.bairro || ''}</span></div>
                    </div>
                    <hr className="my-4" />
                    <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500">Nível:</span><Badge>{avaliacao.nivelSugerido || 'N/A'}</Badge></div>
                        <div className="flex justify-between"><span className="text-gray-500">Carga:</span><span>{avaliacao.cargaSugerida || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Valor:</span><span className="font-semibold text-green-600">{avaliacao.valorProposto ? `R$ ${avaliacao.valorProposto}` : 'N/A'}</span></div>
                    </div>
                </Card>

                {/* Actions */}
                <Card>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Send className="w-4 h-4" />Ações</h3>
                    <div className="space-y-3">
                        <Button className="w-full justify-start bg-green-600 hover:bg-green-700" onClick={() => handleAction('whatsapp')} isLoading={actionLoading === 'whatsapp'}>
                            <MessageCircle className="w-4 h-4" />Enviar Mensagem WhatsApp
                        </Button>
                        <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700" onClick={() => handleAction('enviar_proposta')} isLoading={actionLoading === 'enviar_proposta'}>
                            <FileText className="w-4 h-4" />Enviar Proposta Comercial
                        </Button>
                        <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700" onClick={() => handleAction('enviar_contrato')} isLoading={actionLoading === 'enviar_contrato'}>
                            <FileText className="w-4 h-4" />Enviar Contrato
                        </Button>
                        <hr />
                        <div className="flex gap-2">
                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleAction('aprovar')} isLoading={actionLoading === 'aprovar'}>
                                <CheckCircle className="w-4 h-4" />Aprovar
                            </Button>
                            <Button className="flex-1" variant="danger" onClick={() => handleAction('rejeitar')} isLoading={actionLoading === 'rejeitar'}>
                                <XCircle className="w-4 h-4" />Rejeitar
                            </Button>
                        </div>
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('delete')} isLoading={actionLoading === 'delete'}>
                            <Trash2 className="w-4 h-4 text-red-500" /><span className="text-red-500">Excluir Avaliação</span>
                        </Button>
                    </div>
                </Card>

                {/* Status Info */}
                <Card>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4" />Status</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Status Atual:</span><Badge variant={STATUS_VARIANTS[avaliacao.status] || 'default'}>{avaliacao.status}</Badge></div>
                        <div className="flex justify-between"><span className="text-gray-500">Criado em:</span><span>{new Date(avaliacao.createdAt).toLocaleString('pt-BR')}</span></div>
                        {avaliacao.validadoEm && <div className="flex justify-between"><span className="text-gray-500">Validado em:</span><span>{new Date(avaliacao.validadoEm).toLocaleString('pt-BR')}</span></div>}
                        <hr />
                        <div className="flex justify-between"><span className="text-gray-500">WhatsApp:</span>{avaliacao.whatsappEnviado ? <Badge variant="success">Enviado</Badge> : <Badge variant="warning">Pendente</Badge>}</div>
                        {avaliacao.whatsappErro && <div className="text-xs text-red-500 bg-red-50 p-2 rounded">{avaliacao.whatsappErro}</div>}
                    </div>
                </Card>
            </div>

            {/* Chat History */}
            <Card className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><MessageCircle className="w-4 h-4" />Histórico de Mensagens ({avaliacao.paciente.mensagens?.length || 0})</h3>
                <div className="max-h-80 overflow-y-auto space-y-2 bg-gray-50 p-4 rounded-lg">
                    {avaliacao.paciente.mensagens?.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhuma mensagem</p> :
                        avaliacao.paciente.mensagens?.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.direcao === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${msg.direcao === 'OUT' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                    <p>{msg.conteudo}</p>
                                    <p className={`text-xs mt-1 ${msg.direcao === 'OUT' ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        ))}
                </div>
            </Card>
        </div>
    );
}
