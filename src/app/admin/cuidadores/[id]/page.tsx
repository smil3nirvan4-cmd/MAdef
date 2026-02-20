'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, MessageCircle, Phone, MapPin, Star, Clock,
    Briefcase, Calendar, ChevronDown, ChevronRight
} from 'lucide-react';

interface Mensagem {
    id: string;
    conteudo: string;
    direcao: string;
    flow?: string;
    step?: string;
    timestamp: string;
}

interface Alocacao {
    id: string;
    turno: string;
    status: string;
    dataInicio: string;
    hospital?: string;
    quarto?: string;
    paciente?: { nome: string; };
}

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
    mensagens: Mensagem[];
    alocacoes: Alocacao[];
}

export default function CuidadorDetailPage() {
    const params = useParams();
    const [cuidador, setCuidador] = useState<Cuidador | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());

    useEffect(() => {
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
        fetchData();
    }, [params.id]);

    const toggleFlow = (flow: string) => {
        const newSet = new Set(expandedFlows);
        if (newSet.has(flow)) newSet.delete(flow);
        else newSet.add(flow);
        setExpandedFlows(newSet);
    };

    // Group messages by flow
    const messagesByFlow = cuidador?.mensagens?.reduce((acc, msg) => {
        const flow = msg.flow || 'OUTRAS';
        if (!acc[flow]) acc[flow] = [];
        acc[flow].push(msg);
        return acc;
    }, {} as Record<string, Mensagem[]>) || {};

    // Get unique dates for timeline
    const interactionDates = [...new Set(cuidador?.mensagens?.map(m => new Date(m.timestamp).toLocaleDateString('pt-BR')) || [])];

    if (loading) return <div className="p-8 text-center">Carregando...</div>;
    if (!cuidador) return <div className="p-8 text-center text-error-500">Cuidador não encontrado</div>;

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={cuidador.nome || 'Cuidador'}
                description={`Membro ativo desde ${new Date(cuidador.createdAt).toLocaleDateString('pt-BR')}`}
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Cuidadores', href: '/admin/cuidadores' }, { label: 'Perfil' }]}
                actions={<Link href="/admin/cuidadores"><Button variant="outline"><ArrowLeft className="w-4 h-4" />Voltar</Button></Link>}
            />

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Profile */}
                <Card>
                    <div className="text-center mb-4">
                        <div className="w-20 h-20 bg-secondary-400/20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-secondary-500 mb-3">
                            {cuidador.nome?.charAt(0) || '?'}
                        </div>
                        <h2 className="text-xl font-bold">{cuidador.nome}</h2>
                        <Badge variant="success">Ativo</Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{cuidador.telefone}</div>
                        <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-muted-foreground" />{cuidador.area || 'N/A'}</div>
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{cuidador.endereco || 'N/A'}</div>
                    </div>
                    <hr className="my-4" />
                    <div className="flex justify-around text-center">
                        <div><p className="text-2xl font-bold text-warning-600">{cuidador.quizScore ?? '-'}</p><p className="text-xs text-muted-foreground">Quiz</p></div>
                        <div><p className="text-2xl font-bold text-primary">{cuidador.scoreRH ?? '-'}</p><p className="text-xs text-muted-foreground">RH</p></div>
                        <div><p className="text-2xl font-bold text-secondary-400">{cuidador.alocacoes?.length || 0}</p><p className="text-xs text-muted-foreground">Alocações</p></div>
                    </div>
                    {cuidador.competencias && (
                        <>
                            <hr className="my-4" />
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Competências</p>
                            <p className="text-sm text-foreground">{cuidador.competencias}</p>
                        </>
                    )}
                    <hr className="my-4" />
                    <Button className="w-full bg-secondary-500 hover:bg-secondary-600" onClick={() => window.open(`https://wa.me/${cuidador.telefone.replace(/\D/g, '')}`, '_blank')}>
                        <MessageCircle className="w-4 h-4" />Abrir WhatsApp
                    </Button>
                </Card>

                {/* Interaction History by Flow */}
                <Card className="lg:col-span-2">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" />Histórico de Interações por Fluxo
                    </h3>

                    <div className="mb-4 text-sm text-muted-foreground">
                        <span className="font-medium">{cuidador.mensagens?.length || 0}</span> mensagens em <span className="font-medium">{interactionDates.length}</span> dias
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {Object.entries(messagesByFlow).map(([flow, messages]) => (
                            <div key={flow} className="border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleFlow(flow)}
                                    className="w-full px-4 py-3 bg-background flex items-center justify-between hover:bg-surface-subtle transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedFlows.has(flow) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <Badge variant="info">{flow}</Badge>
                                        <span className="text-sm text-foreground">{messages.length} mensagens</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(messages[0].timestamp).toLocaleDateString('pt-BR')}
                                    </span>
                                </button>

                                {expandedFlows.has(flow) && (
                                    <div className="p-4 bg-background space-y-2 max-h-60 overflow-y-auto">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex ${msg.direcao === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.direcao === 'OUT' ? 'bg-primary text-white' : 'bg-card border'}`}>
                                                    {msg.step && <p className="text-xs opacity-70 mb-1">[{msg.step}]</p>}
                                                    <p>{msg.conteudo}</p>
                                                    <p className={`text-xs mt-1 ${msg.direcao === 'OUT' ? 'text-primary-200' : 'text-muted-foreground'}`}>
                                                        {new Date(msg.timestamp).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {Object.keys(messagesByFlow).length === 0 && (
                            <p className="text-center text-muted-foreground py-4">Nenhuma interação registrada</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Alocações */}
            <Card className="mt-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />Histórico de Alocações ({cuidador.alocacoes?.length || 0})
                </h3>
                {cuidador.alocacoes?.length === 0 ? <p className="text-muted-foreground">Nenhuma alocação</p> :
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-4 py-2 text-left">Paciente</th>
                                    <th className="px-4 py-2 text-left">Local</th>
                                    <th className="px-4 py-2 text-left">Turno</th>
                                    <th className="px-4 py-2 text-left">Data</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {cuidador.alocacoes?.map(a => (
                                    <tr key={a.id} className="hover:bg-background">
                                        <td className="px-4 py-2">{a.paciente?.nome || 'N/A'}</td>
                                        <td className="px-4 py-2">{a.hospital ? `${a.hospital} Q${a.quarto}` : 'Home Care'}</td>
                                        <td className="px-4 py-2">{a.turno}</td>
                                        <td className="px-4 py-2">{new Date(a.dataInicio).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2"><Badge>{a.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
            </Card>
        </div>
    );
}
