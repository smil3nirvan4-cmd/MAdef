'use client';

import { useState, useEffect } from 'react';

interface WhatsAppStatus {
    status: string;
    qrCode: string | null;
    connectedAt: string | null;
}

export default function WhatsAppAdminPage() {
    const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/whatsapp/status');
                const data = await res.json();
                setWaStatus(data);
                setError(null);
            } catch (err) {
                setError('Erro ao carregar status do WhatsApp');
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        // Polling a cada 3 segundos para atualizar QR
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        try {
            await fetch('/api/whatsapp/connect', { method: 'POST' });
        } catch (err) {
            setError('Erro ao iniciar conexão');
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            await fetch('/api/whatsapp/disconnect', { method: 'POST' });
        } catch (err) {
            setError('Erro ao desconectar');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">🔗 Conexão WhatsApp</h1>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
                {/* Status Indicator */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${waStatus?.status === 'CONNECTED' ? 'bg-green-500' :
                            waStatus?.status === 'QR_PENDING' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                            }`} />
                        <span className="font-medium">
                            {waStatus?.status === 'CONNECTED' ? 'Conectado' :
                                waStatus?.status === 'QR_PENDING' ? 'Aguardando Leitura do QR' :
                                    'Desconectado'}
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {waStatus?.status !== 'CONNECTED' && (
                            <button
                                onClick={handleConnect}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                Conectar
                            </button>
                        )}
                        {waStatus?.status === 'CONNECTED' && (
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                Desconectar
                            </button>
                        )}
                    </div>
                </div>

                {/* QR Code Display */}
                {waStatus?.status === 'QR_PENDING' && waStatus?.qrCode && (
                    <div className="flex flex-col items-center py-6">
                        <p className="text-gray-600 mb-4">Escaneie o QR Code com seu WhatsApp:</p>
                        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                            <img
                                src={waStatus.qrCode}
                                alt="QR Code WhatsApp"
                                className="w-64 h-64"
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-4">
                            Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar um aparelho
                        </p>
                    </div>
                )}

                {/* Connected Info */}
                {waStatus?.status === 'CONNECTED' && (
                    <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-green-800">
                            ✅ WhatsApp conectado e recebendo mensagens
                        </p>
                        {waStatus.connectedAt && (
                            <p className="text-sm text-green-600 mt-1">
                                Conectado desde: {new Date(waStatus.connectedAt).toLocaleString('pt-BR')}
                            </p>
                        )}
                    </div>
                )}

                {/* Instructions for Disconnected */}
                {waStatus?.status === 'DISCONNECTED' && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700">
                            Clique em "Conectar" para gerar o QR Code e vincular o WhatsApp Business.
                        </p>
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">📊 Atividade Recente (Logs em Tempo Real)</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <MessagesList />
                </div>
            </div>
        </div>
    );
}

function MessagesList() {
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('/api/whatsapp/messages');
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll logs
        return () => clearInterval(interval);
    }, []);

    if (messages.length === 0) {
        return <p className="text-gray-500 text-center py-4">Nenhuma mensagem registrada ainda.</p>;
    }

    return (
        <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tel</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dir</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conteúdo</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((msg) => (
                        <tr key={msg.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-xs text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-2 text-xs font-medium text-gray-900">
                                {msg.telefone.replace('@s.whatsapp.net', '')}
                            </td>
                            <td className="px-4 py-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full ${msg.direcao === 'IN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {msg.direcao}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700 truncate max-w-md">
                                {msg.conteudo}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
