'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, MessageCircle, UserCheck, UserX, Calendar, Trash2,
    Phone, MapPin, Star, Clock, Briefcase, RefreshCw
} from 'lucide-react';

interface Cuidador {
    id: string;
    nome: string;
    telefone: string;
    area?: string;
    status: string;
    quizScore?: number;
    scoreRH?: number;
    competencias?: string;
    endereco?: string;
    createdAt: string;
    mensagens: Array<{ id: string; conteudo: string; direcao: string; timestamp: string; }>;
    alocacoes: Array<{ id: string; turno: string; status: string; dataInicio: string; paciente?: { nome: string; }; }>;
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    CRIADO: 'default', AGUARDANDO_RH: 'warning', EM_ENTREVISTA: 'info', APROVADO: 'success', REJEITADO: 'error',
};

export default function CandidatoDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [cuidador, setCuidador] = useState<Cuidador | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/candidatos/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setCuidador(data.cuidador);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [params.id]);

    const handleAction = async (action: string, extra?: any) => {
        setActionLoading(action);
        try {
            if (action === 'whatsapp') {
                window.open(`https://wa.me/${cuidador?.telefone.replace(/\D/g, '')}`, '_blank');
            } else if (action === 'delete') {
                if (confirm('Excluir candidato?')) {
                    await fetch(`/api/admin/candidatos/${params.id}`, { method: 'DELETE' });
                    router.push('/admin/candidatos');
                    return;
                }
            } else {
                await fetch(`/api/admin/candidatos/${params.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...extra }),
                });
                fetchData();
            }
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!cuidador) return <div className="p-8 text-center text-red-500">Candidato não encontrado</div>;

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={cuidador.nome || 'Candidato'}
                description={`Tel: ${cuidador.telefone}`}
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Candidatos', href: '/admin/candidatos' }, { label: 'Detalhes' }]}
                actions={<Link href="/admin/candidatos"><Button variant="outline"><ArrowLeft className="w-4 h-4" />Voltar</Button></Link>}
            />

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile */}
                <Card>
                    <div className="text-center mb-4">
                        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-3xl mb-3">
                            {cuidador.nome?.charAt(0) || '?'}
                        </div>
                        <h2 className="text-xl font-bold">{cuidador.nome || 'Sem nome'}</h2>
                        <Badge variant={STATUS_VARIANTS[cuidador.status] || 'default'}>{cuidador.status}</Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{cuidador.telefone}</div>
                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" />{cuidador.area || 'N/A'}</div>
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{cuidador.endereco || 'N/A'}</div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{new Date(cuidador.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <hr className="my-4" />
                    <div className="flex justify-around text-center">
                        <div><p className="text-2xl font-bold text-yellow-600">{cuidador.quizScore ?? '-'}</p><p className="text-xs text-gray-500">Quiz</p></div>
                        <div><p className="text-2xl font-bold text-blue-600">{cuidador.scoreRH ?? '-'}</p><p className="text-xs text-gray-500">RH</p></div>
                        <div><p className="text-2xl font-bold text-green-600">{cuidador.alocacoes?.length || 0}</p><p className="text-xs text-gray-500">Alocações</p></div>
                    </div>
                    {cuidador.competencias && (
                        <>
                            <hr className="my-4" />
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Competências</p>
                            <p className="text-sm text-gray-700">{cuidador.competencias}</p>
                        </>
                    )}
                </Card>

                {/* Actions */}
                <Card>
                    <h3 className="font-semibold mb-4">Ações</h3>
                    <div className="space-y-3">
                        <Button className="w-full justify-start bg-green-600 hover:bg-green-700" onClick={() => handleAction('whatsapp')}>
                            <MessageCircle className="w-4 h-4" />Abrir WhatsApp
                        </Button>
                        <Button className="w-full justify-start" onClick={() => handleAction('aprovar')} isLoading={actionLoading === 'aprovar'}>
                            <UserCheck className="w-4 h-4" />Aprovar Candidato
                        </Button>
                        <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700" onClick={() => handleAction('entrevistar')} isLoading={actionLoading === 'entrevistar'}>
                            <Calendar className="w-4 h-4" />Marcar Entrevista
                        </Button>
                        <Button className="w-full justify-start" variant="danger" onClick={() => handleAction('rejeitar')} isLoading={actionLoading === 'rejeitar'}>
                            <UserX className="w-4 h-4" />Rejeitar
                        </Button>
                        {cuidador.status === 'REJEITADO' && (
                            <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700" onClick={() => handleAction('reativar')} isLoading={actionLoading === 'reativar'}>
                                <RefreshCw className="w-4 h-4" />Reativar
                            </Button>
                        )}
                        <hr />
                        <Button className="w-full justify-start" variant="outline" onClick={() => handleAction('delete')}>
                            <Trash2 className="w-4 h-4 text-red-500" /><span className="text-red-500">Excluir</span>
                        </Button>
                    </div>
                </Card>

                {/* Allocations */}
                <Card>
                    <h3 className="font-semibold mb-4">Alocações ({cuidador.alocacoes?.length || 0})</h3>
                    {cuidador.alocacoes?.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma alocação</p> :
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {cuidador.alocacoes?.map(a => (
                                <div key={a.id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{a.paciente?.nome || 'Sem paciente'}</p>
                                        <p className="text-xs text-gray-500">{a.turno} - {new Date(a.dataInicio).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <Badge>{a.status}</Badge>
                                </div>
                            ))}
                        </div>}
                </Card>
            </div>

            {/* Chat */}
            <Card className="mt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageCircle className="w-4 h-4" />Mensagens ({cuidador.mensagens?.length || 0})</h3>
                <div className="max-h-80 overflow-y-auto space-y-2 bg-gray-50 p-4 rounded-lg">
                    {cuidador.mensagens?.length === 0 ? <p className="text-gray-500 text-center py-4">Nenhuma mensagem</p> :
                        cuidador.mensagens?.map((msg) => (
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
