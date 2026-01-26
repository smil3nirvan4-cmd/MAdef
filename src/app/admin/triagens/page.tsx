'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RefreshCw, MapPin, User, Clock, CheckCircle } from 'lucide-react';

interface WhatsAppState {
    phone: string;
    currentFlow: string;
    currentStep: string;
    data: any;
    lastInteraction: string;
}

export default function TriagensPage() {
    const [states, setStates] = useState<WhatsAppState[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/whatsapp/data-dump');
            const json = await res.json();
            if (json.success) {
                setStates(json.data);
            }
        } catch (_e) {
            console.error(_e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatPhone = (phone: string) => {
        return phone.replace('@lid', '').replace('@s.whatsapp.net', '');
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Triagens WhatsApp"
                description="Dados capturados em tempo real pelo bot de atendimento."
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Triagens' }
                ]}
                actions={
                    <Button variant="outline" onClick={fetchData} isLoading={loading}>
                        <RefreshCw className="w-4 h-4" />
                        Atualizar
                    </Button>
                }
            />

            {loading && states.length === 0 ? (
                <div className="flex justify-center items-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : states.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="text-gray-500 text-lg">Nenhuma triagem em andamento.</p>
                    <p className="text-sm text-gray-400 mt-2">Inicie uma conversa no WhatsApp para ver os dados aqui.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {states.map((state) => {
                        const isProfissional = state.data?.tipo === 'PROFISSIONAL';
                        const isPaciente = state.data?.tipo === 'PACIENTE';
                        const nome = state.data?.nome || state.data?.nomePaciente || 'Visitante';

                        return (
                            <Card key={state.phone} className="hover:shadow-md transition-shadow">
                                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                    {/* User Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <User className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{nome}</h3>
                                                <p className="text-sm text-gray-500">{formatPhone(state.phone)}</p>
                                            </div>
                                            <Badge variant={isProfissional ? 'purple' : isPaciente ? 'info' : 'default'}>
                                                {state.data?.tipo || 'Visitante'}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {new Date(state.lastInteraction).toLocaleString('pt-BR')}
                                            </span>
                                            {state.data?.cidade && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {state.data.cidade}{state.data.bairro ? `, ${state.data.bairro}` : ''}
                                                </span>
                                            )}
                                        </div>

                                        {state.data?.cadastroCompleto && (
                                            <div className="mt-3 flex items-center gap-2 text-green-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Cadastro Completo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status Atual</p>
                                        <Badge variant="warning">
                                            {state.currentFlow} / {state.currentStep}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Data Preview */}
                                <details className="mt-4 pt-4 border-t border-gray-100">
                                    <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                                        Ver dados coletados
                                    </summary>
                                    <pre className="mt-3 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                                        {JSON.stringify(state.data, null, 2)}
                                    </pre>
                                </details>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
