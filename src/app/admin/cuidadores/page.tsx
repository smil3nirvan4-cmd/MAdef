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
    Star, Calendar, Briefcase, MoreHorizontal, UserX
} from 'lucide-react';

interface Cuidador {
    id: string;
    nome: string;
    telefone: string;
    area?: string;
    status: string;
    quizScore?: number;
    scoreRH?: number;
    endereco?: string;
    createdAt: string;
    _count: { mensagens: number; alocacoes: number; };
}

export default function CuidadoresPage() {
    const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterArea, setFilterArea] = useState('ALL');
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ status: 'APROVADO', ...(searchTerm && { search: searchTerm }), ...(filterArea !== 'ALL' && { area: filterArea }) });
            const res = await fetch(`/api/admin/candidatos?${params}`);
            if (res.ok) {
                const data = await res.json();
                setCuidadores(data.cuidadores || []);
            }
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterArea]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (id: string, action: string) => {
        setOpenMenu(null);
        if (action === 'whatsapp') {
            const c = cuidadores.find(x => x.id === id);
            if (c) window.open(`https://wa.me/${c.telefone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
        } else if (action === 'desativar') {
            if (confirm('Desativar este cuidador?')) {
                await fetch(`/api/admin/candidatos/${id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'rejeitar' }),
                });
                fetchData();
            }
        }
    };

    const areas = [...new Set(cuidadores.map(c => c.area).filter(Boolean))];

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Cuidadores Ativos"
                description="Equipe de cuidadores aprovados e disponíveis para alocação."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Cuidadores' }]}
                actions={<Button variant="outline" onClick={fetchList} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="!p-4"><p className="text-2xl font-bold text-success-600">{cuidadores.length}</p><p className="text-xs text-muted-foreground">Cuidadores Ativos</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-info-600">{cuidadores.reduce((s, c) => s + (c._count?.alocacoes || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Alocações</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-primary">{areas.length}</p><p className="text-xs text-muted-foreground">Áreas de Atuação</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-warning-600">{Math.round(cuidadores.reduce((s, c) => s + (c.scoreRH || 0), 0) / (cuidadores.length || 1))}</p><p className="text-xs text-muted-foreground">Score Médio RH</p></Card>
            </div>

            {/* Filters */}
            <Card className="mb-6 !p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-64"><Input placeholder="Buscar..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="ALL">Todas Áreas</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground"><strong>{cuidadores.length}</strong> membros</span>
                </div>
            </Card>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="skeleton h-10 w-10 rounded-full" />
                                    <div>
                                        <div className="skeleton h-4 w-32 mb-2" />
                                        <div className="skeleton h-3 w-24" />
                                    </div>
                                </div>
                                <div className="skeleton h-6 w-16 rounded-full" />
                            </div>
                            <div className="space-y-3">
                                <div className="skeleton h-3 w-full" />
                                <div className="skeleton h-3 w-5/6" />
                                <div className="skeleton h-3 w-4/6" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-border flex justify-between">
                                <div className="skeleton h-8 w-24 rounded-md" />
                                <div className="skeleton h-8 w-8 rounded-md" />
                            </div>
                        </Card>
                    ))
                ) :
                    cuidadores.length === 0 ? <div className="col-span-3 text-center py-8 text-muted-foreground">Nenhum cuidador ativo</div> :
                        cuidadores.map((c) => (
                            <Card key={c.id} className="hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                                            {c.nome?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">{c.nome || 'Sem nome'}</h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />{c.area || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Button size="sm" variant="ghost" onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}>
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                        {openMenu === c.id && (
                                            <div className="absolute right-0 top-8 z-50 bg-card border rounded-lg shadow-lg py-1 w-40">
                                                <button onClick={() => handleAction(c.id, 'whatsapp')} className="w-full px-3 py-2 text-left text-sm hover:bg-background flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4 text-secondary-600" />WhatsApp
                                                </button>
                                                <button onClick={() => handleAction(c.id, 'desativar')} className="w-full px-3 py-2 text-left text-sm hover:bg-error-50 text-error-600 flex items-center gap-2">
                                                    <UserX className="w-4 h-4" />Desativar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-foreground mb-4">
                                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{c.telefone}</div>
                                    {c.endereco && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{c.endereco}</div>}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="flex gap-4 text-xs">
                                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning-500" />{c.scoreRH || '-'}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-info-500" />{c._count?.alocacoes || 0} alocações</span>
                                    </div>
                                    <Link href={`/admin/cuidadores/${c.id}`}>
                                        <Button size="sm" variant="ghost"><Eye className="w-4 h-4" />Ver</Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
            </div>

            {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}
        </div>
    );

    function fetchList() { fetchData(); }
}
