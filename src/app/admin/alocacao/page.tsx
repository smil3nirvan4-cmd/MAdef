'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RefreshCw, Calendar, CheckCircle, Clock, User } from 'lucide-react';

interface Alocacao {
    id: string;
    cuidador: { id: string; nome: string; telefone: string; };
    paciente?: { id: string; nome: string; hospital?: string; quarto?: string; };
    turno: string;
    diaSemana: number;
    dataInicio: string;
    status: string;
    confirmadoT24?: string;
    confirmadoT2?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    PENDENTE_FEEDBACK: { label: 'Aguardando', variant: 'warning' },
    CONFIRMADO: { label: 'Confirmado', variant: 'info' },
    EM_ANDAMENTO: { label: 'Em Andamento', variant: 'success' },
    CONCLUIDO: { label: 'Concluído', variant: 'default' },
    CANCELADO: { label: 'Cancelado', variant: 'error' },
    RECUSADO: { label: 'Recusado', variant: 'error' },
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function EscalasPage() {
    const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/alocacoes');
            if (res.ok) {
                const data = await res.json();
                setAlocacoes(data.alocacoes || []);
                setStats(data.stats);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAction = async (id: string, action: string) => {
        await fetch(`/api/admin/alocacoes/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        fetchData();
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Escalas & Alocações"
                description="Gerencie plantões e alocações de cuidadores."
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Escalas' }]}
                actions={<Button variant="outline" onClick={fetchData} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Calendar className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{stats?.total || 0}</p><p className="text-sm text-gray-500">Total</p></div></div></Card>
                <Card><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">{stats?.pendentes || 0}</p><p className="text-sm text-gray-500">Pendentes</p></div></div></Card>
                <Card><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats?.confirmadas || 0}</p><p className="text-sm text-gray-500">Confirmadas</p></div></div></Card>
                <Card><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><User className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{stats?.emAndamento || 0}</p><p className="text-sm text-gray-500">Em Andamento</p></div></div></Card>
            </div>

            <Card noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b"><tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Cuidador</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Paciente/Local</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Turno</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Carregando...</td></tr> :
                                alocacoes.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhuma alocação</td></tr> :
                                    alocacoes.map((a) => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4"><div className="font-medium">{a.cuidador?.nome || 'N/A'}</div><div className="text-sm text-gray-500">{a.cuidador?.telefone}</div></td>
                                            <td className="px-6 py-4"><div>{a.paciente?.nome || 'Sem paciente'}</div>{a.paciente?.hospital && <div className="text-sm text-gray-500">{a.paciente.hospital} - Q{a.paciente.quarto}</div>}</td>
                                            <td className="px-6 py-4"><Badge>{a.turno}</Badge><div className="text-xs text-gray-500 mt-1">{DIAS[a.diaSemana]} - {new Date(a.dataInicio).toLocaleDateString('pt-BR')}</div></td>
                                            <td className="px-6 py-4"><Badge variant={STATUS_CONFIG[a.status]?.variant || 'default'}>{STATUS_CONFIG[a.status]?.label || a.status}</Badge></td>
                                            <td className="px-6 py-4 text-right">
                                                {a.status === 'PENDENTE_FEEDBACK' && <Button size="sm" onClick={() => handleAction(a.id, 'confirmar')}>Confirmar</Button>}
                                                {a.status === 'CONFIRMADO' && !a.confirmadoT24 && <Button size="sm" variant="outline" onClick={() => handleAction(a.id, 'confirmar_t24')}>T-24h</Button>}
                                                {a.status === 'CONFIRMADO' && a.confirmadoT24 && !a.confirmadoT2 && <Button size="sm" variant="outline" onClick={() => handleAction(a.id, 'confirmar_t2')}>T-2h</Button>}
                                                {a.status === 'EM_ANDAMENTO' && <Button size="sm" className="bg-green-600" onClick={() => handleAction(a.id, 'concluir')}>Concluir</Button>}
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
