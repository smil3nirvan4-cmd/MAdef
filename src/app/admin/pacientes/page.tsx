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
    Building, Calendar, Heart, MoreHorizontal, UserX
} from 'lucide-react';

interface Paciente {
    id: string;
    nome: string;
    telefone: string;
    cidade?: string;
    bairro?: string;
    tipo: string;
    hospital?: string;
    quarto?: string;
    status: string;
    createdAt: string;
    _count: { alocacoes: number; mensagens: number; };
}

export default function PacientesPage() {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState('ALL');
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: 'ATIVO', // Only active patients (contract signed)
                ...(searchTerm && { search: searchTerm }),
                ...(filterTipo !== 'ALL' && { tipo: filterTipo }),
            });
            const res = await fetch(`/api/admin/pacientes?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPacientes(data.pacientes || []);
                setStats(data.stats);
            }
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterTipo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAction = async (id: string, action: string) => {
        setOpenMenu(null);
        if (action === 'whatsapp') {
            const p = pacientes.find(x => x.id === id);
            if (p) window.open(`https://wa.me/${p.telefone.replace(/\D/g, '')}`, '_blank');
        } else if (action === 'desativar') {
            if (confirm('Desativar este paciente?')) {
                await fetch(`/api/admin/pacientes/${id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'INATIVO' }),
                });
                fetchData();
            }
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Pacientes Ativos"
                description="Pacientes com contrato assinado e em atendimento."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Pacientes' }]}
                actions={<Button variant="outline" onClick={fetchData} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="!p-4">
                    <p className="text-2xl font-bold text-green-600">{stats?.ativos || pacientes.length}</p>
                    <p className="text-xs text-gray-500">Pacientes Ativos</p>
                </Card>
                <Card className="!p-4">
                    <p className="text-2xl font-bold text-blue-600">{pacientes.filter(p => p.tipo === 'HOME_CARE').length}</p>
                    <p className="text-xs text-gray-500">Home Care</p>
                </Card>
                <Card className="!p-4">
                    <p className="text-2xl font-bold text-purple-600">{pacientes.filter(p => p.tipo === 'HOSPITAL').length}</p>
                    <p className="text-xs text-gray-500">Hospital</p>
                </Card>
                <Card className="!p-4">
                    <p className="text-2xl font-bold text-orange-600">{pacientes.reduce((s, p) => s + (p._count?.alocacoes || 0), 0)}</p>
                    <p className="text-xs text-gray-500">Total Alocações</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6 !p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="w-64"><Input placeholder="Buscar..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="ALL">Todos os Tipos</option>
                        <option value="HOME_CARE">Home Care</option>
                        <option value="HOSPITAL">Hospital</option>
                    </select>
                    <span className="ml-auto text-sm text-gray-500"><strong>{pacientes.length}</strong> pacientes</span>
                </div>
            </Card>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <div className="col-span-3 text-center py-8 text-gray-500">Carregando...</div> :
                    pacientes.length === 0 ? <div className="col-span-3 text-center py-8 text-gray-500">Nenhum paciente ativo</div> :
                        pacientes.map((p) => (
                            <Card key={p.id} className="hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                            <Heart className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{p.nome || 'Sem nome'}</h3>
                                            <Badge variant={p.tipo === 'HOSPITAL' ? 'purple' : 'info'}>{p.tipo === 'HOSPITAL' ? 'Hospital' : 'Home Care'}</Badge>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Button size="sm" variant="ghost" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}><MoreHorizontal className="w-4 h-4" /></Button>
                                        {openMenu === p.id && (
                                            <div className="absolute right-0 top-8 z-50 bg-white border rounded-lg shadow-lg py-1 w-40">
                                                <button onClick={() => handleAction(p.id, 'whatsapp')} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4 text-green-600" />WhatsApp
                                                </button>
                                                <button onClick={() => handleAction(p.id, 'desativar')} className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                                                    <UserX className="w-4 h-4" />Desativar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{p.telefone}</div>
                                    {p.tipo === 'HOSPITAL' ? (
                                        <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" />{p.hospital} - Q{p.quarto}</div>
                                    ) : (
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{p.cidade || 'N/A'}{p.bairro && `, ${p.bairro}`}</div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="flex gap-4 text-xs">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-500" />{p._count?.alocacoes || 0} alocações</span>
                                    </div>
                                    <Link href={`/admin/pacientes/${p.id}`}>
                                        <Button size="sm" variant="ghost"><Eye className="w-4 h-4" />Ver</Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
            </div>
            {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}
        </div>
    );
}
