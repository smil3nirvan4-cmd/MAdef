'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Search,
    RefreshCw,
    DollarSign,
    Send,
    CheckCircle,
    XCircle,
    Eye,
    Plus
} from 'lucide-react';

interface Orcamento {
    id: string;
    paciente: {
        id: string;
        nome: string;
        telefone: string;
    };
    cenarioEconomico?: string;
    cenarioRecomendado?: string;
    cenarioPremium?: string;
    cenarioSelecionado?: string;
    valorFinal?: number;
    status: string;
    enviadoEm?: string;
    aceitoEm?: string;
    createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' }> = {
    RASCUNHO: { label: 'Rascunho', variant: 'default' },
    APROVADO: { label: 'Aprovado', variant: 'info' },
    ENVIADO: { label: 'Enviado', variant: 'warning' },
    PROPOSTA_ENVIADA: { label: 'Proposta Enviada', variant: 'purple' },
    CONTRATO_ENVIADO: { label: 'Contrato Enviado', variant: 'warning' },
    ACEITO: { label: 'Aceito', variant: 'success' },
    RECUSADO: { label: 'Recusado', variant: 'error' },
    CANCELADO: { label: 'Cancelado', variant: 'error' },
};

export default function OrcamentosPage() {
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchOrcamentos = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/orcamentos');
            if (res.ok) {
                const data = await res.json();
                setOrcamentos(data.orcamentos || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrcamentos();
    }, [fetchOrcamentos]);

    const handleAction = async (id: string, action: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/orcamentos/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                fetchOrcamentos();
            }
        } finally {
            setActionLoading(null);
        }
    };

    const filteredOrcamentos = orcamentos.filter((o) => {
        return (
            o.paciente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.paciente?.telefone?.includes(searchTerm)
        );
    });

    const formatCurrency = (value?: number) => {
        if (!value) return '-';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Orçamentos"
                description="Gerencie propostas comerciais e cenários de preço para pacientes."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Orçamentos' }
                ]}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchOrcamentos} isLoading={loading}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Link href="/admin/orcamentos/novo">
                            <Button>
                                <Plus className="w-4 h-4" />
                                Novo Orçamento
                            </Button>
                        </Link>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{orcamentos.length}</p>
                            <p className="text-sm text-gray-500">Total</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Send className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {orcamentos.filter(o => ['ENVIADO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'].includes(o.status)).length}
                            </p>
                            <p className="text-sm text-gray-500">Enviados</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{orcamentos.filter(o => o.status === 'ACEITO').length}</p>
                            <p className="text-sm text-gray-500">Aceitos</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {formatCurrency(orcamentos.filter(o => o.status === 'ACEITO').reduce((sum, o) => sum + (o.valorFinal || 0), 0))}
                            </p>
                            <p className="text-sm text-gray-500">Receita</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filter */}
            <Card className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-64">
                        <Input
                            placeholder="Buscar por paciente..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="ml-auto text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{filteredOrcamentos.length}</span> orçamentos
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Paciente</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Cenário</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Valor Final</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Data</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : filteredOrcamentos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Nenhum orçamento encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredOrcamentos.map((orc) => {
                                    const statusConfig = STATUS_CONFIG[orc.status] || { label: orc.status, variant: 'default' };
                                    return (
                                        <tr key={orc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{orc.paciente?.nome || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">{orc.paciente?.telefone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700">
                                                    {orc.cenarioSelecionado || 'Não definido'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-900">
                                                    {formatCurrency(orc.valorFinal)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(orc.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {orc.status === 'RASCUNHO' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAction(orc.id, 'enviar')}
                                                            isLoading={actionLoading === orc.id}
                                                        >
                                                            <Send className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                    {['ENVIADO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'].includes(orc.status) && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700"
                                                                onClick={() => handleAction(orc.id, 'aceitar')}
                                                                isLoading={actionLoading === orc.id}
                                                            >
                                                                <CheckCircle className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => handleAction(orc.id, 'cancelar')}
                                                                isLoading={actionLoading === orc.id}
                                                            >
                                                                <XCircle className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Link href={`/admin/orcamentos/${orc.id}`}>
                                                        <Button size="sm" variant="ghost">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
