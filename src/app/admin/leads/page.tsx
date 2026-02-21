'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Search, RefreshCw, MessageCircle, Eye, Phone, MapPin,
    Clock, FileText, Send, MoreHorizontal, ArrowRight
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
    createdAt: string;
    _count: { avaliacoes: number; mensagens: number; };
}

// Etapas do Fluxo: Pendente → Em Análise → Proposta → Contrato → Aprovada → Concluída
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; stage: string }> = {
    LEAD: { label: 'Pendente', variant: 'default', stage: 'Pendente' },
    EM_AVALIACAO: { label: 'Em Análise', variant: 'info', stage: 'Em Análise' },
    AVALIACAO: { label: 'Em Análise', variant: 'info', stage: 'Em Análise' },
    PROPOSTA_ENVIADA: { label: 'Proposta Enviada', variant: 'purple', stage: 'Proposta' },
    PROPOSTA_ACEITA: { label: 'Proposta Aceita', variant: 'success', stage: 'Proposta' },
    PROPOSTA_RECUSADA: { label: 'Proposta Recusada', variant: 'error', stage: 'Proposta' },
    AGUARDANDO_CONTRATO: { label: 'Aguardando Contrato', variant: 'warning', stage: 'Contrato' },
    CONTRATO_ENVIADO: { label: 'Contrato Enviado', variant: 'warning', stage: 'Contrato' },
    ATIVO: { label: 'Aprovada', variant: 'success', stage: 'Aprovada' },
    CONCLUIDO: { label: 'Concluída', variant: 'success', stage: 'Concluída' },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'error' }> = {
    NORMAL: { label: 'Normal', variant: 'default' },
    ALTA: { label: 'Alta', variant: 'warning' },
    URGENTE: { label: 'Urgente', variant: 'error' },
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<{ leads: number; avaliacao: number; proposta: number; contrato: number; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            // Leads = not yet patients (LEAD, AVALIACAO, PROPOSTA_ENVIADA, CONTRATO_ENVIADO)
            const params = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(filterStatus !== 'ALL' && { status: filterStatus }),
            });
            const res = await fetch(`/api/admin/leads?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.data?.leads ?? data.leads ?? []);
                setStats(data.data?.stats ?? data.stats ?? null);
            } else {
                setFetchError(`Erro ao carregar leads (HTTP ${res.status})`);
            }
        } catch (error) {
            setFetchError(error instanceof Error ? error.message : 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterStatus]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (id: string, action: string) => {
        setOpenMenu(null);
        if (action === 'whatsapp') {
            const lead = leads.find(x => x.id === id);
            if (lead) window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank');
        } else {
            await fetch(`/api/admin/pacientes/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action === 'enviar_proposta' ? 'PROPOSTA_ENVIADA' : action === 'enviar_contrato' ? 'CONTRATO_ENVIADO' : action === 'converter' ? 'ATIVO' : action }),
            });
            fetchData();
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Leads & Prospects"
                description="Pessoas interessadas que ainda não são pacientes. Tornam-se pacientes após assinar contrato."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Leads' }]}
                actions={<Button variant="outline" onClick={fetchData} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('LEAD')}>
                    <p className="text-2xl font-bold text-foreground">{stats?.leads || 0}</p>
                    <p className="text-xs text-muted-foreground">Novos Leads</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('AVALIACAO')}>
                    <p className="text-2xl font-bold text-primary">{stats?.avaliacao || 0}</p>
                    <p className="text-xs text-muted-foreground">Em Avaliação</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('PROPOSTA_ENVIADA')}>
                    <p className="text-2xl font-bold text-accent-600">{stats?.proposta || 0}</p>
                    <p className="text-xs text-muted-foreground">Proposta Enviada</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('CONTRATO_ENVIADO')}>
                    <p className="text-2xl font-bold text-warning-600">{stats?.contrato || 0}</p>
                    <p className="text-xs text-muted-foreground">Aguardando Assinatura</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('ALL')}>
                    <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6 !p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-64"><Input placeholder="Buscar..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="ALL">Todos</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground"><strong>{leads.length}</strong> leads</span>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Lead</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Localização</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Atividade</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Data</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} aria-busy="true">
                                        <td className="px-4 py-4"><div className="skeleton h-4 w-32" /></td>
                                        <td className="px-4 py-4"><div className="skeleton h-4 w-40" /></td>
                                        <td className="px-4 py-4"><div className="skeleton h-6 w-24 rounded-full" /></td>
                                        <td className="px-4 py-4"><div className="skeleton h-4 w-32" /></td>
                                        <td className="px-4 py-4"><div className="skeleton h-4 w-24" /></td>
                                        <td className="px-4 py-4"><div className="skeleton h-8 w-24 rounded-md" /></td>
                                    </tr>
                                ))
                            ) : fetchError ? (
                                <tr><td colSpan={6} className="p-8 text-center"><span className="text-error-500">{fetchError}</span><button onClick={fetchData} className="ml-3 text-sm text-primary underline">Tentar novamente</button></td></tr>
                            ) :
                                leads.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead</td></tr> :
                                    leads.map((lead) => {
                                        const st = STATUS_CONFIG[lead.status] || { label: lead.status, variant: 'default' };
                                        const pr = PRIORIDADE_CONFIG[lead.prioridade];
                                        return (
                                            <tr key={lead.id} className="hover:bg-background">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground">{lead.nome || 'Sem nome'}</div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.telefone}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-foreground flex items-center gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{lead.cidade || 'N/A'}{lead.bairro && `, ${lead.bairro}`}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant={st.variant}>{st.label}</Badge>
                                                        {lead.prioridade !== 'NORMAL' && <Badge variant={pr?.variant || 'default'}>{pr?.label}</Badge>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    <div>{lead._count?.avaliacoes || 0} avaliações</div>
                                                    <div>{lead._count?.mensagens || 0} mensagens</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleAction(lead.id, 'whatsapp')}><MessageCircle className="w-4 h-4 text-secondary-600" /></Button>
                                                        <Link href={`/admin/leads/${lead.id}`}><Button size="sm" variant="ghost"><Eye className="w-4 h-4 text-primary" /></Button></Link>
                                                        <div className="relative">
                                                            <Button size="sm" variant="ghost" onClick={() => setOpenMenu(openMenu === lead.id ? null : lead.id)}><MoreHorizontal className="w-4 h-4" /></Button>
                                                            {openMenu === lead.id && (
                                                                <div className="absolute right-0 top-8 z-50 bg-card border rounded-lg shadow-lg py-1 w-48">
                                                                    <button onClick={() => handleAction(lead.id, 'enviar_proposta')} className="w-full px-4 py-2 text-left text-sm hover:bg-background flex items-center gap-2">
                                                                        <Send className="w-4 h-4 text-accent-600" />Enviar Proposta
                                                                    </button>
                                                                    <button onClick={() => handleAction(lead.id, 'enviar_contrato')} className="w-full px-4 py-2 text-left text-sm hover:bg-background flex items-center gap-2">
                                                                        <FileText className="w-4 h-4 text-warning-600" />Enviar Contrato
                                                                    </button>
                                                                    <button onClick={() => handleAction(lead.id, 'converter')} className="w-full px-4 py-2 text-left text-sm hover:bg-success-50 text-secondary-600 flex items-center gap-2">
                                                                        <ArrowRight className="w-4 h-4" />Converter em Paciente
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
            {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}
        </div>
    );
}
