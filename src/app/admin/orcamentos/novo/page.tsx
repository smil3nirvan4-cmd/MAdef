'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PacienteOption {
    id: string;
    nome?: string;
    telefone: string;
}

export default function NovoOrcamentoPage() {
    const router = useRouter();
    const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        pacienteId: '',
        cenarioEconomico: '',
        cenarioRecomendado: '',
        cenarioPremium: '',
        valorFinal: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPacientes() {
            const response = await fetch('/api/admin/pacientes');
            if (!response.ok) return;
            const payload = await response.json();
            setPacientes(payload.pacientes || []);
        }
        loadPacientes();
    }, []);

    const filteredPacientes = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return pacientes;
        return pacientes.filter((paciente) => (
            (paciente.nome || '').toLowerCase().includes(q)
            || String(paciente.telefone || '').includes(q)
        ));
    }, [pacientes, search]);

    const onSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        if (!form.pacienteId) {
            setError('Selecione um paciente.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/admin/orcamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pacienteId: form.pacienteId,
                    cenarioEconomico: form.cenarioEconomico || null,
                    cenarioRecomendado: form.cenarioRecomendado || null,
                    cenarioPremium: form.cenarioPremium || null,
                    valorFinal: form.valorFinal || null,
                }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.success) {
                setError(payload?.error || 'Falha ao criar orçamento.');
                return;
            }

            router.push('/admin/orcamentos');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Novo Orçamento"
                description="Crie um orçamento e salve os cenários para envio posterior."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Orçamentos', href: '/admin/orcamentos' },
                    { label: 'Novo' },
                ]}
            />

            <Card>
                <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Input
                                label="Buscar paciente"
                                placeholder="Nome ou telefone"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm text-gray-600">Paciente</label>
                            <select
                                value={form.pacienteId}
                                onChange={(event) => setForm((prev) => ({ ...prev, pacienteId: event.target.value }))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                                <option value="">Selecione...</option>
                                {filteredPacientes.map((paciente) => (
                                    <option key={paciente.id} value={paciente.id}>
                                        {(paciente.nome || 'Sem nome')} - {paciente.telefone}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Input
                            label="Cenário Econômico"
                            value={form.cenarioEconomico}
                            onChange={(event) => setForm((prev) => ({ ...prev, cenarioEconomico: event.target.value }))}
                        />
                        <Input
                            label="Cenário Recomendado"
                            value={form.cenarioRecomendado}
                            onChange={(event) => setForm((prev) => ({ ...prev, cenarioRecomendado: event.target.value }))}
                        />
                        <Input
                            label="Cenário Premium"
                            value={form.cenarioPremium}
                            onChange={(event) => setForm((prev) => ({ ...prev, cenarioPremium: event.target.value }))}
                        />
                    </div>

                    <Input
                        label="Valor Final (R$)"
                        placeholder="Ex: 6500.00"
                        value={form.valorFinal}
                        onChange={(event) => setForm((prev) => ({ ...prev, valorFinal: event.target.value }))}
                    />

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" isLoading={submitting}>Criar Orçamento</Button>
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/orcamentos')}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

