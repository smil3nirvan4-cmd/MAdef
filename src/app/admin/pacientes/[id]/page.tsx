'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Calendar, MessageCircle, Phone } from 'lucide-react';

export default function PacienteDetalhePage() {
    const params = useParams<{ id: string }>();
    const pacienteId = params?.id;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pacienteId) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/admin/pacientes/${pacienteId}`);
                const json = await res.json().catch(() => ({}));

                if (!res.ok) {
                    setError(json?.error || 'Erro ao carregar paciente');
                    return;
                }

                setData(json?.paciente || null);
            } catch {
                setError('Erro ao carregar paciente');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [pacienteId]);

    if (loading) {
        return <div className="p-6 lg:p-8 text-gray-500">Carregando paciente...</div>;
    }

    if (error || !data) {
        return (
            <div className="p-6 lg:p-8">
                <PageHeader
                    title="Paciente"
                    description={error || 'Paciente não encontrado'}
                    breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Pacientes', href: '/admin/pacientes' }, { label: 'Detalhe' }]}
                />
                <Card>
                    <div className="flex items-center justify-between">
                        <p className="text-red-600">{error || 'Paciente não encontrado'}</p>
                        <Link href="/admin/pacientes">
                            <Button variant="outline"><ArrowLeft className="w-4 h-4" />Voltar</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                title={data.nome || 'Paciente'}
                description={`Telefone: ${data.telefone || '-'}`}
                breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'Pacientes', href: '/admin/pacientes' }, { label: data.nome || 'Detalhe' }]}
                actions={
                    <div className="flex gap-2">
                        <Link href="/admin/pacientes">
                            <Button variant="outline"><ArrowLeft className="w-4 h-4" />Voltar</Button>
                        </Link>
                        {data.telefone && (
                            <a href={`https://wa.me/${String(data.telefone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                                <Button><Phone className="w-4 h-4" />WhatsApp</Button>
                            </a>
                        )}
                    </div>
                }
            />

            <div className="grid lg:grid-cols-3 gap-4">
                <Card>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <Badge variant="info">{data.status || 'N/A'}</Badge>
                </Card>
                <Card>
                    <p className="text-sm text-gray-500 mb-1">Tipo</p>
                    <p className="font-medium">{data.tipo || '-'}</p>
                </Card>
                <Card>
                    <p className="text-sm text-gray-500 mb-1">Local</p>
                    <p className="font-medium">{data.cidade || '-'}{data.bairro ? `, ${data.bairro}` : ''}</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" />Avaliações</h3>
                    <div className="space-y-2">
                        {(data.avaliacoes || []).slice(0, 10).map((a: any) => (
                            <div key={a.id} className="p-3 border rounded-lg">
                                <p className="text-sm font-medium">Status: {a.status}</p>
                                <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                        ))}
                        {(data.avaliacoes || []).length === 0 && <p className="text-sm text-gray-500">Sem avaliações.</p>}
                    </div>
                </Card>

                <Card>
                    <h3 className="font-semibold mb-3">Orçamentos</h3>
                    <div className="space-y-2">
                        {(data.orcamentos || []).slice(0, 10).map((o: any) => (
                            <div key={o.id} className="p-3 border rounded-lg">
                                <p className="text-sm font-medium">Status: {o.status}</p>
                                <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                        ))}
                        {(data.orcamentos || []).length === 0 && <p className="text-sm text-gray-500">Sem orçamentos.</p>}
                    </div>
                </Card>
            </div>

            <Card>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4" />Mensagens</h3>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {(data.mensagens || []).slice(0, 50).map((m: any) => (
                        <div key={m.id} className={`p-3 rounded-lg ${m.direcao === 'OUT' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                            <p className="text-sm">{m.conteudo}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(m.timestamp).toLocaleString('pt-BR')}</p>
                        </div>
                    ))}
                    {(data.mensagens || []).length === 0 && <p className="text-sm text-gray-500">Sem mensagens.</p>}
                </div>
            </Card>
        </div>
    );
}
