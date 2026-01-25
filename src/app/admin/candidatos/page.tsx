'use client';

import { useEffect, useState, useTransition } from 'react';

interface Cuidador {
    id: string;
    telefone: string;
    nome: string | null;
    area: string | null;
    quizScore: number | null;
    status: string;
}

async function fetchCuidadores(): Promise<Cuidador[]> {
    const response = await fetch('/api/admin/candidatos');
    if (!response.ok) throw new Error('Erro ao carregar candidatos');
    return response.json();
}

async function updateCuidador(id: string, action: string): Promise<void> {
    const response = await fetch(`/api/admin/candidatos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar candidato');
    }
}

export default function CandidatosPage() {
    const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadCuidadores();
    }, []);

    async function loadCuidadores() {
        try {
            setLoading(true);
            const data = await fetchCuidadores();
            setCuidadores(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    }

    function handleAction(id: string, action: 'aprovar' | 'rejeitar' | 'entrevistar') {
        const actionLabels = {
            aprovar: 'aprovado',
            rejeitar: 'rejeitado',
            entrevistar: 'marcado para entrevista'
        };

        startTransition(async () => {
            try {
                await updateCuidador(id, action);
                setActionMessage({ type: 'success', text: `Candidato ${actionLabels[action]} com sucesso!` });
                await loadCuidadores();
            } catch (err) {
                setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar ação' });
            }
            setTimeout(() => setActionMessage(null), 3000);
        });
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Gestão de Candidatos (RH)</h1>

            {actionMessage && (
                <div className={`mb-4 p-4 rounded-lg ${actionMessage.type === 'success' ? 'bg-green-50 border-l-4 border-green-400 text-green-700' : 'bg-red-50 border-l-4 border-red-400 text-red-700'}`}>
                    {actionMessage.text}
                </div>
            )}

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <p className="font-medium">Fluxo Implementado via WhatsApp:</p>
                <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                    <li>Candidato faz Quiz no ZAP</li>
                    <li>Aprovados aparecem aqui com status <strong>AGUARDANDO_RH</strong></li>
                    <li>RH entrevista e aprova manualmente</li>
                </ul>
            </div>

            {loading ? (
                <div className="bg-white p-12 text-center rounded-lg border">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Carregando candidatos...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
                    <p className="text-red-600">{error}</p>
                    <button 
                        onClick={loadCuidadores}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Tentar Novamente
                    </button>
                </div>
            ) : (
                <div className="border rounded-lg bg-white overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome/Tel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {cuidadores.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum candidato aguardando aprovação no momento.
                                    </td>
                                </tr>
                            ) : (
                                cuidadores.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{c.telefone}</div>
                                            <div className="text-sm text-gray-500">{c.nome || 'Nome pendente'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {c.area || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {c.quizScore ? `${c.quizScore}%` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button 
                                                onClick={() => handleAction(c.id, 'entrevistar')}
                                                disabled={isPending}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4 disabled:opacity-50"
                                            >
                                                Entrevistar
                                            </button>
                                            <button 
                                                onClick={() => handleAction(c.id, 'aprovar')}
                                                disabled={isPending}
                                                className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50"
                                            >
                                                Aprovar
                                            </button>
                                            <button 
                                                onClick={() => handleAction(c.id, 'rejeitar')}
                                                disabled={isPending}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                            >
                                                Rejeitar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
