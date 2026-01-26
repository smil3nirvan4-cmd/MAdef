'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Search, RefreshCw, Send, Eye, Trash2, MessageCircle,
    FileText, MoreHorizontal, CheckCircle, XCircle, Filter, Plus
} from 'lucide-react';

interface Avaliacao {
    id: string;
    paciente: { id: string; nome: string; telefone: string; prioridade?: string; };
    status: string;
    nivelSugerido?: string;
    valorProposto?: string;
    whatsappEnviado: boolean;
    whatsappErro?: string;
    createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }> = {
    PENDENTE: { label: 'Pendente', variant: 'warning' },
    ENVIADA: { label: 'Enviada', variant: 'info' },
    EM_ANALISE: { label: 'Em Análise', variant: 'info' },
    PROPOSTA_ENVIADA: { label: 'Proposta Enviada', variant: 'purple' },
    CONTRATO_ENVIADO: { label: 'Contrato Enviado', variant: 'purple' },
    APROVADA: { label: 'Aprovada', variant: 'success' },
    REJEITADA: { label: 'Rejeitada', variant: 'error' },
    CONCLUIDA: { label: 'Concluída', variant: 'success' },
};

export default function AvaliacoesPage() {
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const fetchAvaliacoes = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/avaliacoes');
            if (res.ok) {
                const data = await res.json();
                setAvaliacoes(data.avaliacoes || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAvaliacoes(); }, [fetchAvaliacoes]);

    const handleAction = async (id: string, action: string, extra?: any) => {
        setActionLoading(id);
        setOpenMenu(null);
        try {
            if (action === 'whatsapp') {
                await fetch('/api/admin/avaliacoes/reenviar-whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ avaliacaoId: id }),
                });
            } else if (action === 'delete') {
                if (confirm('Tem certeza que deseja excluir esta avaliação?')) {
                    await fetch(`/api/admin/avaliacoes/${id}`, { method: 'DELETE' });
                }
            } else {
                await fetch(`/api/admin/avaliacoes/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...extra }),
                });
            }
            fetchAvaliacoes();
        } finally {
            setActionLoading(null);
        }
    };

    const filteredAvaliacoes = avaliacoes.filter((a) => {
        const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
        const matchesSearch = a.paciente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || a.paciente?.telefone?.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Avaliações de Pacientes"
                description="Gerencie avaliações, propostas e contratos."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Avaliações' }]}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchAvaliacoes} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>
                        <Link href="/admin/avaliacoes/nova"><Button><Plus className="w-4 h-4" />Nova</Button></Link>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {[
                    { label: 'Pendentes', value: avaliacoes.filter(a => a.status === 'PENDENTE').length, color: 'yellow' },
                    { label: 'Em Análise', value: avaliacoes.filter(a => a.status === 'EM_ANALISE').length, color: 'blue' },
                    { label: 'Propostas', value: avaliacoes.filter(a => a.status === 'PROPOSTA_ENVIADA').length, color: 'purple' },
                    { label: 'Contratos', value: avaliacoes.filter(a => a.status === 'CONTRATO_ENVIADO').length, color: 'indigo' },
                    { label: 'Concluídas', value: avaliacoes.filter(a => a.status === 'CONCLUIDA').length, color: 'green' },
                ].map((stat) => (
                    <Card key={stat.label} className="!p-4">
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="mb-6 !p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-64">
                        <Input placeholder="Buscar paciente..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                            <option value="ALL">Todos</option>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                    <span className="ml-auto text-sm text-gray-500"><strong>{filteredAvaliacoes.length}</strong> avaliações</span>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paciente</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nível / Valor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">WhatsApp</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando...</td></tr> :
                                filteredAvaliacoes.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma avaliação</td></tr> :
                                    filteredAvaliacoes.map((av) => {
                                        const st = STATUS_CONFIG[av.status] || { label: av.status, variant: 'default' };
                                        return (
                                            <tr key={av.id} className="hover:bg-gray-50 group">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{av.paciente?.nome || 'N/A'}</div>
                                                    <div className="text-sm text-gray-500">{av.paciente?.telefone}</div>
                                                </td>
                                                <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium">{av.nivelSugerido || '-'}</div>
                                                    <div className="text-sm text-gray-500">{av.valorProposto ? `R$ ${av.valorProposto}` : '-'}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {av.whatsappEnviado ? <Badge variant="success">✓ Enviado</Badge> : av.whatsappErro ? <Badge variant="error">Erro</Badge> : <Badge variant="warning">Pendente</Badge>}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{new Date(av.createdAt).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Quick Actions */}
                                                        <Button size="sm" variant="ghost" onClick={() => handleAction(av.id, 'whatsapp')} isLoading={actionLoading === av.id} title="Enviar WhatsApp">
                                                            <MessageCircle className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Link href={`/admin/avaliacoes/${av.id}`}>
                                                            <Button size="sm" variant="ghost" title="Ver Detalhes"><Eye className="w-4 h-4 text-blue-600" /></Button>
                                                        </Link>

                                                        {/* Dropdown Menu */}
                                                        <div className="relative">
                                                            <Button size="sm" variant="ghost" onClick={() => setOpenMenu(openMenu === av.id ? null : av.id)}>
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                            {openMenu === av.id && (
                                                                <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48">
                                                                    <button onClick={() => handleAction(av.id, 'enviar_proposta')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <FileText className="w-4 h-4 text-purple-600" /> Enviar Proposta
                                                                    </button>
                                                                    <button onClick={() => handleAction(av.id, 'enviar_contrato')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <FileText className="w-4 h-4 text-indigo-600" /> Enviar Contrato
                                                                    </button>
                                                                    <button onClick={() => handleAction(av.id, 'aprovar')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <CheckCircle className="w-4 h-4 text-green-600" /> Aprovar
                                                                    </button>
                                                                    <button onClick={() => handleAction(av.id, 'rejeitar')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <XCircle className="w-4 h-4 text-red-600" /> Rejeitar
                                                                    </button>
                                                                    <hr className="my-1" />
                                                                    <button onClick={() => handleAction(av.id, 'delete')} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                                                                        <Trash2 className="w-4 h-4" /> Excluir
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Click outside to close menu */}
            {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}
        </div>
    );
}
