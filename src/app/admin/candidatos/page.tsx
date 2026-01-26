'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Search, RefreshCw, UserCheck, UserX, Calendar, Trash2,
    MessageCircle, MoreHorizontal, Eye, Filter, Plus, Star, MapPin, Phone
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
    _count: { mensagens: number; alocacoes: number; };
}

interface Stats {
    total: number;
    aguardandoRH: number;
    emEntrevista: number;
    aprovados: number;
    rejeitados: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }> = {
    CRIADO: { label: 'Novo', variant: 'default' },
    AGUARDANDO_RH: { label: 'Aguardando RH', variant: 'warning' },
    EM_ENTREVISTA: { label: 'Em Entrevista', variant: 'info' },
    APROVADO: { label: 'Aprovado', variant: 'success' },
    REJEITADO: { label: 'Rejeitado', variant: 'error' },
};

export default function CandidatosPage() {
    const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterArea, setFilterArea] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [showScoreModal, setShowScoreModal] = useState<string | null>(null);
    const [scoreValue, setScoreValue] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                ...(filterStatus !== 'ALL' && { status: filterStatus }),
                ...(filterArea !== 'ALL' && { area: filterArea }),
                ...(searchTerm && { search: searchTerm }),
            });
            const res = await fetch(`/api/admin/candidatos?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCuidadores(data.cuidadores || []);
                setStats(data.stats);
            }
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterArea, searchTerm]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (id: string, action: string, extra?: any) => {
        setActionLoading(id);
        setOpenMenu(null);
        try {
            if (action === 'whatsapp') {
                const c = cuidadores.find(x => x.id === id);
                if (c) window.open(`https://wa.me/${c.telefone.replace(/\D/g, '')}`, '_blank');
            } else if (action === 'delete') {
                if (confirm('Excluir candidato e todo histórico?')) {
                    await fetch(`/api/admin/candidatos/${id}`, { method: 'DELETE' });
                    fetchData();
                }
            } else {
                await fetch(`/api/admin/candidatos/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, ...extra }),
                });
                fetchData();
            }
        } finally {
            setActionLoading(null);
            setShowScoreModal(null);
            setScoreValue('');
        }
    };

    const areas = [...new Set(cuidadores.map(c => c.area).filter(Boolean))];

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Gestão de Candidatos"
                description="Avalie e gerencie cuidadores em processo seletivo."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Candidatos' }]}
                actions={<Button variant="outline" onClick={fetchData} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('AGUARDANDO_RH')}>
                    <p className="text-2xl font-bold text-yellow-600">{stats?.aguardandoRH || 0}</p>
                    <p className="text-xs text-gray-500">Aguardando RH</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('EM_ENTREVISTA')}>
                    <p className="text-2xl font-bold text-blue-600">{stats?.emEntrevista || 0}</p>
                    <p className="text-xs text-gray-500">Em Entrevista</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('APROVADO')}>
                    <p className="text-2xl font-bold text-green-600">{stats?.aprovados || 0}</p>
                    <p className="text-xs text-gray-500">Aprovados</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('REJEITADO')}>
                    <p className="text-2xl font-bold text-red-600">{stats?.rejeitados || 0}</p>
                    <p className="text-xs text-gray-500">Rejeitados</p>
                </Card>
                <Card className="!p-4 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus('ALL')}>
                    <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
                    <p className="text-xs text-gray-500">Total</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6 !p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-64">
                        <Input placeholder="Buscar nome ou telefone..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="ALL">Todos Status</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="ALL">Todas Áreas</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <span className="ml-auto text-sm text-gray-500"><strong>{cuidadores.length}</strong> candidatos</span>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Candidato</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Área</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scores</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Atividade</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">Carregando...</td></tr> :
                                cuidadores.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum candidato</td></tr> :
                                    cuidadores.map((c) => {
                                        const st = STATUS_CONFIG[c.status] || { label: c.status, variant: 'default' };
                                        return (
                                            <tr key={c.id} className="hover:bg-gray-50 group">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{c.nome || 'Sem nome'}</div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefone}</div>
                                                    {c.endereco && <div className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.endereco}</div>}
                                                </td>
                                                <td className="px-4 py-3"><Badge>{c.area || 'N/A'}</Badge></td>
                                                <td className="px-4 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {c.quizScore !== null && <span className="flex items-center gap-1" title="Quiz Score"><Star className="w-3 h-3 text-yellow-500" />{c.quizScore}</span>}
                                                        {c.scoreRH !== null && <span className="flex items-center gap-1" title="Score RH"><UserCheck className="w-3 h-3 text-blue-500" />{c.scoreRH}</span>}
                                                        {!c.quizScore && !c.scoreRH && <span className="text-gray-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs text-gray-500">
                                                        <div>{c._count?.mensagens || 0} msgs</div>
                                                        <div>{c._count?.alocacoes || 0} alocações</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleAction(c.id, 'whatsapp')} title="WhatsApp">
                                                            <MessageCircle className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Link href={`/admin/candidatos/${c.id}`}>
                                                            <Button size="sm" variant="ghost" title="Ver"><Eye className="w-4 h-4 text-blue-600" /></Button>
                                                        </Link>
                                                        <div className="relative">
                                                            <Button size="sm" variant="ghost" onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}>
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                            {openMenu === c.id && (
                                                                <div className="absolute right-0 top-8 z-50 bg-white border rounded-lg shadow-lg py-1 w-48">
                                                                    <button onClick={() => setShowScoreModal(c.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <UserCheck className="w-4 h-4 text-green-600" />Aprovar (c/ Score)
                                                                    </button>
                                                                    <button onClick={() => handleAction(c.id, 'entrevistar')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <Calendar className="w-4 h-4 text-blue-600" />Marcar Entrevista
                                                                    </button>
                                                                    <button onClick={() => handleAction(c.id, 'rejeitar')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                        <UserX className="w-4 h-4 text-red-600" />Rejeitar
                                                                    </button>
                                                                    {c.status === 'REJEITADO' && (
                                                                        <button onClick={() => handleAction(c.id, 'reativar')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                                            <RefreshCw className="w-4 h-4 text-purple-600" />Reativar
                                                                        </button>
                                                                    )}
                                                                    <hr className="my-1" />
                                                                    <button onClick={() => handleAction(c.id, 'delete')} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                                                                        <Trash2 className="w-4 h-4" />Excluir
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

            {/* Click outside */}
            {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}

            {/* Score Modal */}
            {showScoreModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Card className="w-96">
                        <h3 className="font-semibold text-lg mb-4">Aprovar Candidato</h3>
                        <Input label="Score RH (0-100)" type="number" value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} />
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowScoreModal(null)} className="flex-1">Cancelar</Button>
                            <Button onClick={() => handleAction(showScoreModal, 'aprovar', { scoreRH: parseInt(scoreValue) || 0 })} isLoading={actionLoading === showScoreModal} className="flex-1">Aprovar</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
