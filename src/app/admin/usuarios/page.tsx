'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, User, Phone, MessageSquare, ExternalLink, X } from 'lucide-react';

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

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    LEAD: 'default',
    AVALIACAO: 'info',
    ATIVO: 'success',
    CRIADO: 'default',
    AGUARDANDO_RH: 'warning',
    APROVADO: 'success',
    REPROVADO: 'error',
};

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
    const [filterTipo, setFilterTipo] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/usuarios');
            if (res.ok) {
                const data = await res.json();
                setUsuarios(data.usuarios);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredUsuarios = usuarios.filter((u) => {
        const matchesTipo = filterTipo === 'ALL' || u.tipo === filterTipo;
        const matchesSearch =
            u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.telefone.includes(searchTerm);
        return matchesTipo && matchesSearch;
    });

    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 13) {
            return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
        }
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        }
        return phone;
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title="Usuários & Mensagens"
                description="Gerenciamento de pacientes e cuidadores com histórico de conversas"
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Usuários' }
                ]}
            />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Users List */}
                <div className="lg:w-1/3">
                    <Card noPadding>
                        {/* Filters */}
                        <div className="p-4 border-b border-border space-y-3">
                            <Input
                                placeholder="Buscar por nome ou telefone..."
                                icon={Search}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="flex gap-2">
                                {['ALL', 'PACIENTE', 'CUIDADOR'].map((tipo) => (
                                    <button
                                        key={tipo}
                                        onClick={() => setFilterTipo(tipo)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterTipo === tipo
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-subtle text-foreground hover:bg-neutral-200'
                                            }`}
                                    >
                                        {tipo === 'ALL' ? 'Todos' : tipo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User List */}
                        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                            ) : filteredUsuarios.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</div>
                            ) : (
                                filteredUsuarios.map((usuario) => (
                                    <button
                                        key={usuario.id}
                                        onClick={() => setSelectedUser(usuario)}
                                        className={`w-full p-4 text-left hover:bg-background transition-colors ${selectedUser?.id === usuario.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground truncate">{usuario.nome}</p>
                                                <p className="text-sm text-muted-foreground">{formatPhone(usuario.telefone)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <Badge variant={usuario.tipo === 'PACIENTE' ? 'purple' : 'info'}>
                                                    {usuario.tipo}
                                                </Badge>
                                                <Badge variant={STATUS_VARIANTS[usuario.status] || 'default'}>
                                                    {usuario.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" />
                                            {usuario.mensagens?.length || 0} mensagens
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* User Details */}
                <div className="lg:w-2/3">
                    {selectedUser ? (
                        <Card noPadding>
                            {/* Header */}
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">{selectedUser.nome}</h3>
                                        <p className="text-sm text-muted-foreground">{formatPhone(selectedUser.telefone)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/admin/usuarios/logs/${selectedUser.telefone.replace(/\D/g, '')}`}
                                        className="text-sm text-primary hover:underline flex items-center gap-1"
                                    >
                                        Ver Logs <ExternalLink className="w-3 h-3" />
                                    </Link>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-1 hover:bg-surface-subtle rounded lg:hidden"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="p-4 bg-background max-h-[50vh] overflow-y-auto space-y-3">
                                {selectedUser.mensagens.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Nenhuma mensagem encontrada.</p>
                                ) : (
                                    selectedUser.mensagens.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.direcao === 'OUT' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.direcao === 'OUT'
                                                    ? 'bg-primary text-white rounded-br-md'
                                                    : 'bg-card border border-border text-foreground rounded-bl-md'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                                                <p className={`text-xs mt-1 ${msg.direcao === 'OUT' ? 'text-primary-200' : 'text-muted-foreground'}`}>
                                                    {new Date(msg.createdAt).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <User className="w-12 h-12 mb-4 text-muted-foreground/50" />
                            <p>Selecione um usuário para ver os detalhes</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
