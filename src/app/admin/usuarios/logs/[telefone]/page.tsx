'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SystemLog {
    id: string;
    type: string;
    action: string;
    message: string;
    metadata: string | null;
    stack: string | null;
    createdAt: string;
}

interface Mensagem {
    id: string;
    conteudo: string;
    direcao: string;
    flow: string | null;
    step: string | null;
    createdAt: string;
}

interface Usuario {
    id: string;
    nome: string;
    telefone: string;
    tipo: 'PACIENTE' | 'CUIDADOR';
    status: string;
    mensagens: Mensagem[];
    createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
    ERROR: 'bg-error-100 text-error-700',
    WARNING: 'bg-warning-100 text-warning-600',
    INFO: 'bg-info-100 text-primary',
    WHATSAPP: 'bg-success-100 text-secondary-700',
    DEBUG: 'bg-surface-subtle text-foreground',
};

export default function UserLogsPage() {
    const params = useParams();
    const telefone = params.telefone as string;

    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'logs' | 'mensagens'>('mensagens');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Buscar logs do usuário
            const logsRes = await fetch(`/api/admin/usuarios/${telefone}/logs`);
            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setLogs(logsData.logs || []);
                setUsuario(logsData.usuario || null);
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    }, [telefone]);

    useEffect(() => {
        if (telefone) fetchData();
    }, [telefone, fetchData]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length >= 11) {
            return `(${cleaned.slice(-11, -9)}) ${cleaned.slice(-9, -4)}-${cleaned.slice(-4)}`;
        }
        return phone;
    };

    const parseMetadata = (metadata: string | null) => {
        if (!metadata) return null;
        try { return JSON.parse(metadata); } catch { return metadata; }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/admin/usuarios" className="text-primary hover:underline text-sm mb-2 inline-block">
                    ← Voltar para Usuários
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {formatPhone(telefone)}
                        </h1>
                        {usuario && (
                            <p className="text-foreground mt-1">
                                {usuario.nome} • {usuario.tipo} • {usuario.status}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={fetchData}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-hover transition-colors"
                    >
                        Atualizar
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-error-50 border border-error-100 rounded-lg p-4 mb-6">
                    <p className="text-error-700">{error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-lg shadow p-4">
                    <p className="text-sm text-muted-foreground">Logs do Sistema</p>
                    <p className="text-2xl font-bold text-primary">{logs.length}</p>
                </div>
                <div className="bg-card rounded-lg shadow p-4">
                    <p className="text-sm text-muted-foreground">Mensagens WhatsApp</p>
                    <p className="text-2xl font-bold text-secondary-600">{usuario?.mensagens?.length || 0}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-card rounded-lg shadow overflow-hidden">
                <div className="border-b flex">
                    <button
                        onClick={() => setActiveTab('mensagens')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'mensagens'
                                ? 'bg-success-50 text-secondary-700 border-b-2 border-secondary-500'
                                : 'text-foreground hover:bg-background'
                            }`}
                    >
                        Mensagens WhatsApp ({usuario?.mensagens?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'logs'
                                ? 'bg-info-50 text-primary border-b-2 border-primary-500'
                                : 'text-foreground hover:bg-background'
                            }`}
                    >
                        Logs do Sistema ({logs.length})
                    </button>
                </div>

                {/* Mensagens Tab */}
                {activeTab === 'mensagens' && (
                    <div className="p-4 max-h-[500px] overflow-y-auto">
                        {!usuario?.mensagens?.length ? (
                            <p className="text-muted-foreground text-center py-8">Nenhuma mensagem registrada</p>
                        ) : (
                            <div className="space-y-3">
                                {usuario.mensagens.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`p-3 rounded-lg max-w-[80%] ${msg.direcao === 'OUT' ? 'bg-info-100 ml-auto' : 'bg-surface-subtle'
                                            }`}
                                    >
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.conteudo}</p>
                                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                            <span>{formatDate(msg.createdAt)}</span>
                                            {msg.flow && (
                                                <span className="bg-neutral-200 px-2 py-0.5 rounded">
                                                    {msg.flow} {msg.step ? `→ ${msg.step}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="divide-y max-h-[500px] overflow-y-auto">
                        {logs.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">Nenhum log encontrado</p>
                        ) : (
                            logs.map((log) => (
                                <Fragment key={log.id}>
                                    <div className="p-4 hover:bg-background">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[log.type] || TYPE_COLORS.DEBUG}`}>
                                                        {log.type}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                                                </div>
                                                <p className="font-mono text-sm text-foreground">{log.action}</p>
                                                <p className="text-sm text-foreground mt-1">{log.message}</p>
                                            </div>
                                            {(log.metadata || log.stack) && (
                                                <button
                                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                    className="text-primary hover:text-primary text-sm"
                                                >
                                                    {expandedLog === log.id ? '▼' : '▶'}
                                                </button>
                                            )}
                                        </div>

                                        {expandedLog === log.id && log.metadata && (
                                            <pre className="mt-3 bg-neutral-800 text-success-500 p-3 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(parseMetadata(log.metadata), null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </Fragment>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
