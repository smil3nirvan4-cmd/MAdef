'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Wifi, WifiOff, QrCode, MessageCircle, Settings, Send, Zap, RotateCcw,
    Trash2, Power, Clock, Users, RefreshCw, BarChart3, FileText,
    Calendar, MessageSquare, Search, X, Plus, ExternalLink, ChevronRight,
    Tag, Ban, Bot, ListOrdered, Webhook, Download, Layout, Radio, Megaphone, Shield
} from 'lucide-react';
import { LabelsTab, BlacklistTab, AutoRepliesTab, QueueTab, WebhooksTab, ExportImportTab } from './AdvancedTabs';
import { FlowBuilderTab } from './FlowBuilder';

type TabType = 'connection' | 'chats' | 'contacts' | 'flows' | 'templates' | 'quickreplies' | 'scheduled' | 'broadcast' | 'analytics' | 'automation' | 'labels' | 'blacklist' | 'autoreplies' | 'queue' | 'webhooks' | 'config' | 'settings';

interface DbSchemaStatusResponse {
    success: boolean;
    dbSchemaOk?: boolean;
    missingColumns?: string[];
}

function normalizeContactPhone(value: unknown): string {
    return String(value || '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace(/\D/g, '');
}

function dedupeContacts<T extends { phone?: string; telefone?: string }>(rows: T[]): T[] {
    const map = new Map<string, T>();
    const fallback: T[] = [];

    for (const row of rows) {
        const phone = normalizeContactPhone(row.phone || row.telefone);
        if (!phone) {
            fallback.push(row);
            continue;
        }
        if (!map.has(phone)) {
            map.set(phone, { ...row, phone } as T);
            continue;
        }

        const existing = map.get(phone)!;
        const existingTotal = Number((existing as any).totalMessages || 0);
        const nextTotal = Number((row as any).totalMessages || 0);
        map.set(phone, nextTotal >= existingTotal ? ({ ...row, phone } as T) : existing);
    }

    return [...map.values(), ...fallback];
}

const TAB_GROUPS = [
    {
        label: 'Principal',
        icon: Layout,
        items: [
            { id: 'connection' as TabType, label: 'Conexao', icon: Wifi, description: 'Status e QR Code' },
            { id: 'chats' as TabType, label: 'Conversas', icon: MessageCircle, description: 'Chat em tempo real' },
            { id: 'contacts' as TabType, label: 'Contatos', icon: Users, description: 'Gestao de contatos' },
            { id: 'analytics' as TabType, label: 'Relatorios', icon: BarChart3, description: 'Metricas e dados' },
        ],
    },
    {
        label: 'Automacao',
        icon: Zap,
        items: [
            { id: 'flows' as TabType, label: 'Fluxos', icon: Zap, description: 'Construtor de fluxos' },
            { id: 'templates' as TabType, label: 'Templates', icon: FileText, description: 'Modelos de mensagem' },
            { id: 'quickreplies' as TabType, label: 'Respostas Rapidas', icon: MessageSquare, description: 'Atalhos de resposta' },
            { id: 'autoreplies' as TabType, label: 'Auto-Resposta', icon: Bot, description: 'Regras automaticas' },
            { id: 'automation' as TabType, label: 'Configuracoes', icon: Settings, description: 'Rate limit e horarios' },
        ],
    },
    {
        label: 'Envio',
        icon: Megaphone,
        items: [
            { id: 'broadcast' as TabType, label: 'Broadcast', icon: Send, description: 'Envio em massa' },
            { id: 'scheduled' as TabType, label: 'Agendados', icon: Calendar, description: 'Mensagens futuras' },
            { id: 'queue' as TabType, label: 'Fila de Envio', icon: ListOrdered, description: 'Pendentes e falhas' },
        ],
    },
    {
        label: 'Gestao',
        icon: Shield,
        items: [
            { id: 'labels' as TabType, label: 'Etiquetas', icon: Tag, description: 'Tags de contato' },
            { id: 'blacklist' as TabType, label: 'Bloqueados', icon: Ban, description: 'Lista negra' },
            { id: 'webhooks' as TabType, label: 'Webhooks', icon: Webhook, description: 'Integracoes externas' },
            { id: 'config' as TabType, label: 'Backup', icon: Download, description: 'Exportar/Importar' },
        ],
    },
];

export default function WhatsAppAdminPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('connection');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [dbSchemaStatus, setDbSchemaStatus] = useState<{ ok: boolean; missingColumns: string[] }>({
        ok: true,
        missingColumns: [],
    });

    const allTabs = TAB_GROUPS.flatMap((g) => g.items);

    useEffect(() => {
        const tabFromQuery = searchParams.get('tab');
        const pathSegment = pathname?.startsWith('/admin/whatsapp/')
            ? pathname.replace('/admin/whatsapp/', '').split('/')[0]
            : '';
        const tabFromUrl = tabFromQuery || pathSegment;
        if (!tabFromUrl) return;
        const normalized = tabFromUrl === 'settings' ? 'automation' : tabFromUrl;
        const exists = allTabs.some((tab) => tab.id === normalized);
        if (exists) setActiveTab(normalized as TabType);
    }, [pathname, searchParams]);

    useEffect(() => {
        let active = true;
        async function loadSchemaStatus() {
            try {
                const response = await fetch('/api/admin/capabilities', { cache: 'no-store' });
                const payload: DbSchemaStatusResponse = await response.json().catch(() => ({ success: false }));
                if (!active || !response.ok || !payload.success) return;
                setDbSchemaStatus({
                    ok: payload.dbSchemaOk !== false,
                    missingColumns: Array.isArray(payload.missingColumns) ? payload.missingColumns : [],
                });
            } catch {
                // keep previous state
            }
        }
        loadSchemaStatus();
        return () => { active = false; };
    }, []);

    const handleTabChange = (nextTab: TabType) => {
        setActiveTab(nextTab);
        router.replace(`/admin/whatsapp/${nextTab}`);
    };

    const activeTabMeta = allTabs.find((t) => t.id === activeTab);

    return (
        <div className="p-4 lg:p-6">
            <PageHeader title="Central WhatsApp" description="Comunicacao, automacao e gestao completa" breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'WhatsApp' }]} />

            {!dbSchemaStatus.ok && (
                <div className="mb-4 rounded-md border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
                    <p className="font-medium">Database schema drift detectado.</p>
                    <p className="mt-1">Colunas ausentes: {dbSchemaStatus.missingColumns.join(', ') || 'nao informado'}.</p>
                </div>
            )}

            <div className="flex gap-4">
                {/* Sidebar Navigation */}
                <nav className={`flex-shrink-0 ${sidebarCollapsed ? 'w-14' : 'w-56'} transition-all duration-200`}>
                    <div className="sticky top-4 space-y-1">
                        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="w-full flex items-center justify-center p-2 mb-2 rounded-md text-muted-foreground hover:bg-surface-subtle text-xs">
                            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <span>Recolher</span>}
                        </button>

                        {TAB_GROUPS.map((group) => (
                            <div key={group.label}>
                                {!sidebarCollapsed && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 mt-3 first:mt-0">
                                        <group.icon className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                                    </div>
                                )}
                                {sidebarCollapsed && <div className="border-t border-border my-2" />}
                                {group.items.map((tab) => (
                                    <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                                        title={sidebarCollapsed ? tab.label : undefined}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                                            activeTab === tab.id
                                                ? 'bg-primary/10 text-primary font-medium shadow-sm border border-primary/20'
                                                : 'text-foreground hover:bg-surface-subtle hover:text-foreground'
                                        } ${sidebarCollapsed ? 'justify-center' : ''}`}>
                                        <tab.icon className="w-4 h-4 flex-shrink-0" />
                                        {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Active tab header */}
                    {activeTabMeta && (
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <activeTabMeta.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">{activeTabMeta.label}</h2>
                                <p className="text-xs text-muted-foreground">{activeTabMeta.description}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'connection' && <ConnectionTab />}
                    {activeTab === 'chats' && <ChatsTab />}
                    {activeTab === 'contacts' && <ContactsTab />}
                    {activeTab === 'flows' && <FlowBuilderTab />}
                    {activeTab === 'templates' && <TemplatesTab />}
                    {activeTab === 'quickreplies' && <QuickRepliesTab />}
                    {activeTab === 'scheduled' && <ScheduledTab />}
                    {activeTab === 'broadcast' && <BroadcastTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'automation' && <AutomationTab />}
                    {activeTab === 'labels' && <LabelsTab />}
                    {activeTab === 'blacklist' && <BlacklistTab />}
                    {activeTab === 'autoreplies' && <AutoRepliesTab />}
                    {activeTab === 'queue' && <QueueTab />}
                    {activeTab === 'webhooks' && <WebhooksTab />}
                    {activeTab === 'config' && <ExportImportTab />}
                </div>
            </div>
        </div>
    );
}

// CONNECTION TAB
function ConnectionTab() {
    const [waStatus, setWaStatus] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/whatsapp/status', { cache: 'no-store' });
            setWaStatus(await res.json());
        } catch (_e) {
            // ignore polling errors
        }
    }, []);

    const pollInterval = waStatus?.status === 'QR_PENDING' || waStatus?.status === 'PAIRING_CODE' ? 2000 : 5000;

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, pollInterval);
        return () => clearInterval(interval);
    }, [fetchStatus, pollInterval]);

    const handleAction = async (action: string) => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            await fetch(`/api/whatsapp/${action}`, { method: 'POST' });
        } finally {
            setActionLoading(false);
            await fetchStatus();
        }
    };

    const handleResetSession = async () => {
        if (actionLoading) return;
        if (!confirm('Isso vai encerrar a sessao atual e gerar um novo QR. Deseja continuar?')) return;
        setActionLoading(true);
        try {
            await fetch('/api/whatsapp/reset-auth', { method: 'POST' });
            await fetch('/api/whatsapp/connect', { method: 'POST' });
        } finally {
            setActionLoading(false);
            await fetchStatus();
        }
    };

    const isConnected = waStatus?.status === 'CONNECTED';
    const isConnecting = waStatus?.status === 'CONNECTING' || waStatus?.isConnecting === true;
    const isBridgeOffline = waStatus?.bridgeRunning === false;
    const recommendedCommand = waStatus?.recommendedCommand || 'npm run dev';

    const statusLabel = isConnected ? 'Conectado'
        : waStatus?.status === 'CONNECTING' ? 'Conectando...'
            : waStatus?.status === 'QR_PENDING' ? 'Aguardando QR'
                : waStatus?.status === 'PAIRING_CODE' ? 'Aguardando pareamento'
                    : 'Desconectado';

    const statusColor = isConnected ? 'bg-success-500' : isConnecting ? 'bg-warning-500' : 'bg-error-500';

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            <Card className="!p-0 overflow-hidden">
                <div className={`px-6 py-4 ${isConnected ? 'bg-success-50' : isBridgeOffline ? 'bg-warning-50' : 'bg-surface-subtle'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${isConnected ? 'bg-success-100' : 'bg-error-100'}`}>
                                {isConnected ? <Wifi className="w-6 h-6 text-success-600" /> : <WifiOff className="w-6 h-6 text-error-600" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${statusColor} ${isConnecting ? 'animate-pulse' : ''}`} />
                                    <p className="font-semibold text-lg">{statusLabel}</p>
                                </div>
                                {waStatus?.connectedAt && isConnected && (
                                    <p className="text-sm text-muted-foreground mt-0.5">Conectado desde {new Date(waStatus.connectedAt).toLocaleString('pt-BR')}</p>
                                )}
                                {waStatus?.phone && isConnected && (
                                    <p className="text-sm text-muted-foreground font-mono">{waStatus.phone}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isConnected ? (
                                <Button onClick={() => handleAction('connect')} isLoading={actionLoading || isConnecting}>
                                    <Power className="w-4 h-4" />{isConnecting ? 'Conectando...' : 'Conectar'}
                                </Button>
                            ) : (
                                <Button variant="danger" onClick={() => handleAction('disconnect')} isLoading={actionLoading}>
                                    <Power className="w-4 h-4" />Desconectar
                                </Button>
                            )}
                            <Button variant="outline" onClick={handleResetSession} isLoading={actionLoading} disabled={isConnecting}>
                                <RotateCcw className="w-4 h-4" />Trocar Conta
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* QR / Pairing / Status */}
                <Card>
                    <h3 className="font-semibold mb-4">Autenticacao</h3>
                    {waStatus?.status === 'QR_PENDING' && waStatus?.qrCode && (
                        <div className="flex flex-col items-center py-4">
                            <p className="text-foreground mb-2 font-medium">Escaneie o QR Code no seu celular:</p>
                            <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 bg-success-500 rounded-full animate-pulse" />
                                Atualizando automaticamente a cada 2s
                            </p>
                            <img src={waStatus.qrCode} alt="QR" className="w-56 h-56 border-2 border-primary/20 rounded-xl shadow-sm" />
                            <p className="text-xs text-muted-foreground mt-3">WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo</p>
                        </div>
                    )}
                    {waStatus?.status === 'PAIRING_CODE' && waStatus?.pairingCode && (
                        <div className="p-5 bg-info-50 rounded-lg border border-indigo-200">
                            <p className="font-semibold text-indigo-900 mb-2">Codigo de pareamento</p>
                            <p className="text-info-600 text-sm mb-4">No WhatsApp: Dispositivos conectados &gt; Conectar com numero de telefone</p>
                            <code className="bg-neutral-900 text-success-500 px-4 py-2.5 rounded-lg text-2xl tracking-[0.3em] font-mono block text-center">{waStatus.pairingCode}</code>
                        </div>
                    )}
                    {isConnected && (
                        <div className="p-5 bg-success-50 rounded-lg border border-success-200 text-center">
                            <Wifi className="w-8 h-8 text-success-600 mx-auto mb-2" />
                            <p className="font-semibold text-success-700">WhatsApp conectado e operacional</p>
                            <p className="text-xs text-success-600 mt-1">Todas as automacoes e fluxos estao funcionando</p>
                        </div>
                    )}
                    {waStatus?.status === 'DISCONNECTED' && !isBridgeOffline && (
                        <div className="p-5 bg-info-50 rounded-lg border border-blue-200 text-center">
                            <Radio className="w-8 h-8 text-primary mx-auto mb-2" />
                            <p className="font-semibold text-primary">Bridge online - Pronto para conectar</p>
                            <p className="text-sm text-muted-foreground mt-1">Clique em <strong>Conectar</strong> acima para gerar o QR Code</p>
                        </div>
                    )}
                    {isBridgeOffline && (
                        <div className="p-5 bg-warning-50 rounded-lg border border-warning-200">
                            <p className="font-semibold text-warning-700 mb-2">Bridge WhatsApp offline</p>
                            <p className="text-sm text-warning-600 mb-3">Execute o comando abaixo para iniciar:</p>
                            <code className="bg-neutral-900 text-success-500 px-3 py-2 rounded block font-mono text-sm">{recommendedCommand}</code>
                        </div>
                    )}
                </Card>

                {/* System Info */}
                <Card>
                    <h3 className="font-semibold mb-4">Informacoes do Sistema</h3>
                    <div className="space-y-2 text-sm">
                        {[
                            { label: 'Numero Conectado', value: waStatus?.phone || '-', mono: true },
                            { label: 'Versao WhatsApp', value: waStatus?.version || '-' },
                            { label: 'Bateria', value: waStatus?.battery ? `${waStatus.battery}%` : '-' },
                            { label: 'Plataforma', value: waStatus?.platform || '-' },
                            { label: 'Bridge', value: isBridgeOffline ? 'Offline' : 'Online' },
                            { label: 'Status', value: waStatus?.status || 'UNKNOWN' },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border/50">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className={`font-medium ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// CHATS TAB - Full conversation view
function ChatsTab() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchContacts = async () => {
        const res = await fetch(`/api/admin/whatsapp/contacts${search ? `?search=${search}` : ''}`);
        if (res.ok) { const data = await res.json(); setContacts(dedupeContacts(data.contacts || [])); }
    };

    const fetchChat = async (phone: string) => {
        const res = await fetch(`/api/admin/whatsapp/chat/${phone}`);
        if (res.ok) { const data = await res.json(); setSelectedChat(data.contact); setMessages(data.messages || []); }
    };

    useEffect(() => { fetchContacts(); }, []);

    // Auto-refresh messages for selected chat
    useEffect(() => {
        if (!selectedChat?.phone) return;
        const interval = setInterval(() => fetchChat(selectedChat.phone), 8000);
        return () => clearInterval(interval);
    }, [selectedChat?.phone]);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        setSending(true);
        setSendError(null);
        try {
            const res = await fetch(`/api/admin/whatsapp/chat/${selectedChat.phone}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage }),
            });
            const data = await res.json().catch(() => ({}));
            if (!data.success) {
                setSendError(data.error || `Falha ao enviar (status: ${data.status || res.status})`);
            }
            setNewMessage('');
            fetchChat(selectedChat.phone);
        } catch (err) {
            setSendError('Erro de conexao ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    const handleRefreshContacts = async () => {
        setRefreshing(true);
        await fetchContacts();
        setRefreshing(false);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-4 h-[75vh]">
            {/* Contacts List */}
            <Card className="!p-0 overflow-hidden flex flex-col">
                <div className="p-3 border-b flex gap-2">
                    <Input placeholder="Buscar contato..." icon={Search} value={search} onChange={(e) => { setSearch(e.target.value); fetchContacts(); }} className="flex-1" />
                    <button onClick={handleRefreshContacts} className="p-2 rounded-md hover:bg-surface-subtle" title="Atualizar">
                        <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum contato encontrado</p>}
                    {contacts.map((c, index) => (
                        <button key={`${normalizeContactPhone(c.phone) || c.phone || c.telefone || 'contact'}-${index}`} onClick={() => fetchChat(c.phone)} className={`w-full p-3 text-left border-b border-border/50 hover:bg-surface-subtle flex items-center gap-3 transition-colors ${selectedChat?.phone === c.phone ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${c.type === 'cuidador' ? 'bg-blue-500' : c.type === 'paciente' ? 'bg-emerald-500' : 'bg-neutral-400'}`}>
                                {c.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-foreground text-sm">{c.name || 'Desconhecido'}</p>
                                <p className="text-xs text-muted-foreground font-mono">{c.phone}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <Badge variant={c.type === 'cuidador' ? 'info' : c.type === 'paciente' ? 'success' : 'default'} className="text-[10px]">
                                    {c.type === 'cuidador' ? 'Cuidador' : c.type === 'paciente' ? 'Paciente' : 'Outro'}
                                </Badge>
                                <p className="text-[10px] text-muted-foreground mt-1">{c.totalMessages} msgs</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Chat View */}
            <Card className="lg:col-span-2 !p-0 flex flex-col overflow-hidden">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b bg-card flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${selectedChat.type === 'cuidador' ? 'bg-blue-500' : selectedChat.type === 'paciente' ? 'bg-emerald-500' : 'bg-neutral-400'}`}>
                                {selectedChat.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{selectedChat.name || 'Desconhecido'}</p>
                                <p className="text-xs text-muted-foreground font-mono">{selectedChat.phone}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchChat(selectedChat.phone)} className="p-2 rounded-md hover:bg-surface-subtle" title="Atualizar conversa">
                                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                </button>
                                {selectedChat.entityId && (
                                    <a href={`/admin/${selectedChat.type === 'cuidador' ? 'cuidadores' : 'pacientes'}/${selectedChat.entityId}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors border border-primary/20">
                                        <ExternalLink className="w-3.5 h-3.5" />Ver Perfil
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
                            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem nesta conversa</p>}
                            {messages.map((msg) => {
                                const isOut = msg.direcao === 'OUT';
                                const isFailed = msg.direcao === 'OUT_FAILED';
                                const isPending = msg.direcao === 'OUT_PENDING';
                                return (
                                    <div key={msg.id} className={`flex ${isOut || isFailed || isPending ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                                            isOut ? 'bg-primary text-primary-foreground rounded-br-md'
                                                : isFailed ? 'bg-error-50 text-error-700 border border-error-200 rounded-bl-md'
                                                    : isPending ? 'bg-warning-50 text-warning-700 border border-warning-200 rounded-bl-md'
                                                        : 'bg-card border border-border rounded-bl-md'
                                        }`}>
                                            {msg.flow && <p className="text-[10px] opacity-60 mb-1 font-mono">{msg.flow}/{msg.step}</p>}
                                            <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                {isFailed && <span className="text-[10px] text-error-500">Falhou</span>}
                                                {isPending && <span className="text-[10px] text-warning-500">Pendente</span>}
                                                <p className={`text-[10px] ${isOut ? 'text-primary-200' : 'text-muted-foreground'}`}>
                                                    {new Date(msg.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Message Input */}
                        <div className="p-3 border-t bg-card space-y-2">
                            {sendError && (
                                <div className="px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-error-700 text-xs flex items-center justify-between">
                                    <span>{sendError}</span>
                                    <button onClick={() => setSendError(null)} className="ml-2 text-error-400 hover:text-error-700"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input placeholder="Digite sua mensagem..." value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                    className="flex-1" />
                                <Button onClick={handleSend} isLoading={sending} disabled={!newMessage.trim()}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <MessageCircle className="w-12 h-12 opacity-30" />
                        <p className="text-sm">Selecione uma conversa para visualizar</p>
                    </div>
                )}
            </Card>
        </div>
    );
}

// CONTACTS TAB
function ContactsTab() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchContacts = async () => {
        const res = await fetch(`/api/admin/whatsapp/contacts?type=${filter}${search ? `&search=${search}` : ''}`);
        if (res.ok) { const data = await res.json(); setContacts(dedupeContacts(data.contacts || [])); }
    };
    useEffect(() => { fetchContacts(); }, [filter]);

    return (
        <div className="space-y-6">
            <Card className="!p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <Input placeholder="Buscar telefone..." icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
                    <Button size="sm" variant="outline" onClick={fetchContacts}>Buscar</Button>
                    <div className="flex gap-1 ml-auto">
                        {['all', 'cuidador', 'paciente', 'unknown'].map((t) => (
                            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-md text-sm transition-colors ${filter === t ? 'bg-primary-100 text-primary' : 'bg-surface-subtle text-foreground hover:bg-neutral-200'}`}>
                                {t === 'all' ? 'Todos' : t === 'cuidador' ? 'Cuidadores' : t === 'paciente' ? 'Pacientes' : 'Desconhecidos'}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>
            <Card noPadding>
                <table className="w-full text-sm text-foreground">
                    <thead className="bg-surface-subtle border-b border-border"><tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Contato</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Tipo</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Mensagens</th>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Última Interação</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">Ações</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                        {contacts.map((c, index) => (
                            <tr key={`${normalizeContactPhone(c.phone) || c.phone || c.telefone || 'contact'}-${index}`} className="hover:bg-surface-subtle transition-colors">
                                <td className="px-4 py-3"><p className="font-medium">{c.name}</p><p className="text-muted-foreground font-mono text-xs tabular-nums">{c.phone}</p></td>
                                <td className="px-4 py-3"><Badge variant={c.type === 'cuidador' ? 'info' : c.type === 'paciente' ? 'success' : 'default'}>{c.type}</Badge></td>
                                <td className="px-4 py-3 tabular-nums">{c.totalMessages} <span className="text-muted-foreground">({c.messagesIn}↓ {c.messagesOut}↑)</span></td>
                                <td className="px-4 py-3 text-muted-foreground tabular-nums">{c.lastMessage ? new Date(c.lastMessage).toLocaleString('pt-BR') : '-'}</td>
                                <td className="px-4 py-3 text-right">
                                    <a href={`https://wa.me/${c.phone}`} target="_blank" className="text-secondary-600 mr-2 hover:underline">WA</a>
                                    {c.entityId && <a href={`/admin/${c.type === 'cuidador' ? 'cuidadores' : 'pacientes'}/${c.entityId}`} className="text-primary hover:underline">Perfil</a>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

// FLOWS TAB
function FlowsTab() {
    const [flows, setFlows] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    const fetchFlows = async () => {
        const res = await fetch('/api/admin/whatsapp/flows');
        if (res.ok) { const data = await res.json(); setFlows(data.flowStates || []); setStats(data.stats); }
    };
    useEffect(() => { fetchFlows(); }, []);

    const handleReset = async (phone: string) => {
        await fetch('/api/admin/whatsapp/flows', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, action: 'reset' }) });
        fetchFlows();
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="!p-4"><p className="text-2xl font-bold text-primary">{stats?.totalActive || 0}</p><p className="text-xs text-muted-foreground">Fluxos Ativos</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-accent-500">{stats?.triagem || 0}</p><p className="text-xs text-muted-foreground">Triagem</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-secondary-400">{stats?.avaliacao || 0}</p><p className="text-xs text-muted-foreground">Avaliação</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-foreground">{stats?.idle || 0}</p><p className="text-xs text-muted-foreground">Idle</p></Card>
            </div>
            <Card noPadding>
                <div className="p-4 border-b flex justify-between"><h3 className="font-semibold">Estados dos Fluxos</h3><Button size="sm" variant="outline" onClick={fetchFlows}><RefreshCw className="w-4 h-4" /></Button></div>
                <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-sm text-foreground">
                        <thead className="bg-surface-subtle border-b border-border"><tr><th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Telefone</th><th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Fluxo</th><th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Etapa</th><th className="px-4 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Última</th><th className="px-4 py-2 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">Ação</th></tr></thead>
                        <tbody className="divide-y divide-border">
                            {flows.map((f) => (
                                <tr key={f.id} className="hover:bg-surface-subtle transition-colors">
                                    <td className="px-4 py-2 font-mono text-xs tabular-nums">{f.phone}</td>
                                    <td className="px-4 py-2"><Badge variant={f.currentFlow === 'IDLE' ? 'default' : 'info'}>{f.currentFlow}</Badge></td>
                                    <td className="px-4 py-2 text-muted-foreground">{f.currentStep || '-'}</td>
                                    <td className="px-4 py-2 text-muted-foreground tabular-nums">{new Date(f.lastInteraction).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2 text-right"><Button size="sm" variant="ghost" onClick={() => handleReset(f.phone)}><RotateCcw className="w-4 h-4" /></Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// TEMPLATES TAB
function TemplatesTab() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', category: 'geral', content: '' });

    const fetchTemplates = async () => {
        const res = await fetch('/api/admin/whatsapp/templates');
        if (res.ok) { const data = await res.json(); setTemplates(data.templates || []); setCategories(data.categories || []); }
    };
    useEffect(() => { fetchTemplates(); }, []);

    const handleAdd = async () => {
        await fetch('/api/admin/whatsapp/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTemplate) });
        setNewTemplate({ name: '', category: 'geral', content: '' }); setShowAdd(false); fetchTemplates();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Excluir template?')) { await fetch(`/api/admin/whatsapp/templates?id=${id}`, { method: 'DELETE' }); fetchTemplates(); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold">Templates de Mensagem</h2>
                <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Novo Template</Button>
            </div>
            {showAdd && (
                <Card>
                    <h3 className="font-semibold mb-4">Novo Template</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Input label="Nome" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} />
                        <div><label className="text-sm text-foreground">Categoria</label><select value={newTemplate.category} onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{['onboarding', 'escala', 'comercial', 'feedback', 'financeiro', 'geral'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="mb-4"><label className="text-sm text-foreground">Conteúdo</label><p className="text-xs text-muted-foreground mb-1">Use {'{{variavel}}'} para dados dinâmicos</p><textarea className="w-full border border-border-hover rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-ring" value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} /></div>
                    <div className="flex gap-2"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                    <Card key={t.id} className="hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <div><p className="font-semibold">{t.name}</p><Badge variant="purple">{t.category}</Badge></div>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-error-500" /></Button>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{t.content}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// QUICK REPLIES TAB
function QuickRepliesTab() {
    const [replies, setReplies] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newReply, setNewReply] = useState({ shortcut: '', content: '' });

    const fetchReplies = async () => { const res = await fetch('/api/admin/whatsapp/quick-replies'); if (res.ok) { const data = await res.json(); setReplies(data.replies || []); } };
    useEffect(() => { fetchReplies(); }, []);

    const handleAdd = async () => { await fetch('/api/admin/whatsapp/quick-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newReply) }); setNewReply({ shortcut: '', content: '' }); setShowAdd(false); fetchReplies(); };
    const handleDelete = async (id: string) => { await fetch(`/api/admin/whatsapp/quick-replies?id=${id}`, { method: 'DELETE' }); fetchReplies(); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-semibold">Respostas Rápidas</h2><Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Nova</Button></div>
            {showAdd && (
                <Card>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Input label="Atalho (ex: /oi)" value={newReply.shortcut} onChange={(e) => setNewReply({ ...newReply, shortcut: e.target.value })} />
                        <div className="md:col-span-2"><label className="text-sm text-foreground">Conteúdo</label><textarea className="w-full border rounded-lg p-2 mt-1 h-16" value={newReply.content} onChange={(e) => setNewReply({ ...newReply, content: e.target.value })} /></div>
                    </div>
                    <div className="flex gap-2 mt-4"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {replies.map((r) => (
                    <Card key={r.id} className="flex items-start gap-3">
                        <code className="bg-info-100 text-primary px-2 py-1 rounded text-sm">{r.shortcut}</code>
                        <p className="flex-1 text-sm text-foreground">{r.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><X className="w-4 h-4 text-error-500" /></Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// SCHEDULED TAB
function ScheduledTab() {
    const [scheduled, setScheduled] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newMsg, setNewMsg] = useState({ phone: '', message: '', scheduledAt: '' });

    const fetchScheduled = async () => { const res = await fetch('/api/admin/whatsapp/scheduled'); if (res.ok) { const data = await res.json(); setScheduled(data.scheduled || []); } };
    useEffect(() => { fetchScheduled(); }, []);

    const handleAdd = async () => { await fetch('/api/admin/whatsapp/scheduled', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMsg) }); setNewMsg({ phone: '', message: '', scheduledAt: '' }); setShowAdd(false); fetchScheduled(); };
    const handleDelete = async (id: string) => { await fetch(`/api/admin/whatsapp/scheduled?id=${id}`, { method: 'DELETE' }); fetchScheduled(); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-semibold">Mensagens Agendadas</h2><Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Agendar</Button></div>
            {showAdd && (
                <Card>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <Input label="Telefone" value={newMsg.phone} onChange={(e) => setNewMsg({ ...newMsg, phone: e.target.value })} placeholder="5511999999999" />
                        <Input label="Data/Hora" type="datetime-local" value={newMsg.scheduledAt} onChange={(e) => setNewMsg({ ...newMsg, scheduledAt: e.target.value })} />
                    </div>
                    <div className="mb-4"><label className="text-sm text-foreground">Mensagem</label><textarea className="w-full border rounded-lg p-3 h-24 mt-1" value={newMsg.message} onChange={(e) => setNewMsg({ ...newMsg, message: e.target.value })} /></div>
                    <div className="flex gap-2"><Button onClick={handleAdd}>Agendar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <Card noPadding>
                <table className="w-full text-sm text-foreground">
                    <thead className="bg-surface-subtle border-b border-border"><tr><th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Telefone</th><th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Mensagem</th><th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider text-xs">Agendado Para</th><th className="px-4 py-3 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">Ação</th></tr></thead>
                    <tbody className="divide-y divide-border">
                        {scheduled.map((s) => (
                            <tr key={s.id} className="hover:bg-surface-subtle transition-colors"><td className="px-4 py-3 font-mono text-xs tabular-nums">{s.phone}</td><td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{s.message}</td><td className="px-4 py-3 tabular-nums text-muted-foreground">{new Date(s.scheduledAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-error-500" /></Button></td></tr>
                        ))}
                    </tbody>
                </table>
                {scheduled.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma mensagem agendada</p>}
            </Card>
        </div>
    );
}

// BROADCAST TAB
function BroadcastTab() {
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState<'cuidadores' | 'pacientes' | 'leads' | 'custom'>('cuidadores');
    const [customPhones, setCustomPhones] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSend = async () => {
        if (!message.trim()) return; setSending(true); setResult(null);
        let phones: string[] = [];
        if (targetType === 'custom') { phones = customPhones.split(/[\n,;]/).map(p => p.trim()).filter(Boolean); }
        else { const res = await fetch(`/api/admin/${targetType === 'leads' ? 'leads' : targetType === 'pacientes' ? 'pacientes?status=ATIVO' : 'candidatos?status=APROVADO'}`); if (res.ok) { const data = await res.json(); phones = (data.cuidadores || data.pacientes || data.leads || []).map((i: any) => i.telefone).filter(Boolean); } }
        const res = await fetch('/api/admin/whatsapp/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phones, message }) });
        setResult(await res.json()); setSending(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <h3 className="font-semibold mb-4"><Send className="w-4 h-4 inline mr-2" />Enviar Broadcast</h3>
                <div className="mb-4"><label className="text-sm text-foreground block mb-2">Destinatários</label><div className="flex flex-wrap gap-2">{[{ id: 'cuidadores', label: 'Cuidadores' }, { id: 'pacientes', label: 'Pacientes' }, { id: 'leads', label: 'Leads' }, { id: 'custom', label: 'Personalizado' }].map((opt) => (<button key={opt.id} onClick={() => setTargetType(opt.id as any)} className={`px-3 py-2 rounded-lg text-sm ${targetType === opt.id ? 'bg-info-100 text-primary border-blue-300' : 'bg-surface-subtle'} border`}>{opt.label}</button>))}</div></div>
                {targetType === 'custom' && <div className="mb-4"><textarea className="w-full border rounded-lg p-2 h-24 font-mono text-sm" value={customPhones} onChange={(e) => setCustomPhones(e.target.value)} placeholder="5511999999999&#10;5521888888888" /></div>}
                <div className="mb-4"><label className="text-sm text-foreground">Mensagem</label><textarea className="w-full border border-border-hover rounded-md p-3 h-32 mt-1 focus:outline-none focus:ring-2 focus:ring-ring" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Digite..." /><p className="text-xs text-muted-foreground mt-1">{message.length} caracteres</p></div>
                <Button onClick={handleSend} isLoading={sending} className="w-full"><Send className="w-4 h-4" />Enviar</Button>
                {result && <div className={`mt-4 p-3 rounded-lg ${result.success ? 'bg-success-50 text-secondary-700' : 'bg-error-50 text-error-700'}`}>{result.success ? `${result.message}` : `${result.error}`}</div>}
            </Card>
            <Card>
                <h3 className="font-semibold mb-4">Templates Rápidos</h3>
                <div className="space-y-2">{[{ name: 'Lembrete Plantão', text: 'Olá! Lembrando do seu plantão amanhã. Confirme com OK.' }, { name: 'Aviso Geral', text: 'Atenção equipe! Temos novidades importantes.' }, { name: 'Pesquisa', text: 'Olá! Gostaríamos de saber sua opinião...' }].map((tpl) => (<button key={tpl.name} onClick={() => setMessage(tpl.text)} className="w-full text-left p-3 rounded-lg border hover:bg-background"><p className="font-medium text-sm">{tpl.name}</p><p className="text-xs text-muted-foreground truncate">{tpl.text}</p></button>))}</div>
            </Card>
        </div>
    );
}

// ANALYTICS TAB
function AnalyticsTab() {
    const [data, setData] = useState<any>(null);
    const [period, setPeriod] = useState('7d');

    const fetchAnalytics = async () => { const res = await fetch(`/api/admin/whatsapp/analytics?period=${period}`); if (res.ok) setData(await res.json()); };
    useEffect(() => { fetchAnalytics(); }, [period]);

    if (!data) return <div className="text-center py-8">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold">Relatórios & Analytics</h2>
                <div className="flex gap-1">{['24h', '7d', '30d'].map((p) => (<button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded-md text-sm transition-colors ${period === p ? 'bg-primary-100 text-primary' : 'bg-surface-subtle text-foreground hover:bg-neutral-200'}`}>{p}</button>))}</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="!p-4"><p className="text-2xl font-bold text-primary">{data.summary?.totalMessages || 0}</p><p className="text-xs text-muted-foreground">Total Mensagens</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-secondary-400">{data.summary?.messagesIn || 0}</p><p className="text-xs text-muted-foreground">Recebidas</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-accent-500">{data.summary?.messagesOut || 0}</p><p className="text-xs text-muted-foreground">Enviadas</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-accent-500">{data.summary?.uniqueContacts || 0}</p><p className="text-xs text-muted-foreground">Contatos Únicos</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-primary-400">{data.summary?.responseRate || 0}%</p><p className="text-xs text-muted-foreground">Taxa Resposta</p></Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                <Card><h3 className="font-semibold mb-4">Mensagens por Fluxo</h3><div className="space-y-2">{data.messagesByFlow?.map((f: any) => (<div key={f.flow} className="flex justify-between items-center p-2 bg-background rounded"><span>{f.flow}</span><Badge>{f.count}</Badge></div>))}</div></Card>
                <Card><h3 className="font-semibold mb-4">Horários de Pico</h3><div className="space-y-2">{data.peakHours?.map((h: any) => (<div key={h.hour} className="flex justify-between items-center p-2 bg-background rounded"><span>{h.hour}:00</span><Badge variant="info">{h.count} msgs</Badge></div>))}</div></Card>
            </div>
            <Card><h3 className="font-semibold mb-4">Conversões</h3><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-accent-500/10 rounded-lg text-center"><p className="text-2xl font-bold text-accent-600">{data.flowStats?.triagemStarted || 0}</p><p className="text-sm text-foreground">Triagens Iniciadas</p></div><div className="p-4 bg-success-50 rounded-lg text-center"><p className="text-2xl font-bold text-secondary-600">{data.flowStats?.completed || 0}</p><p className="text-sm text-foreground">Aprovados no Período</p></div></div></Card>
        </div>
    );
}

// AUTOMATION TAB
function AutomationTab() {
    const [settings, setSettings] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { const fetchSettings = async () => { const res = await fetch('/api/admin/whatsapp/settings'); if (res.ok) { const data = await res.json(); setSettings(data.settings); setStats(data.stats); } }; fetchSettings(); }, []);

    const updateSetting = async (key: string, value: any) => { setSettings({ ...settings, [key]: value }); setSaving(true); await fetch('/api/admin/whatsapp/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }); setSaving(false); };

    if (!settings) return <div className="text-center py-8">Carregando...</div>;

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <h3 className="font-semibold mb-4"><Zap className="w-4 h-4 inline mr-2" />Automação</h3>
                <div className="space-y-4">{[{ key: 'autoReplyEnabled', label: 'Respostas Automáticas' }, { key: 'autoTriagemCuidador', label: 'Triagem Cuidador Auto' }, { key: 'autoTriagemPaciente', label: 'Triagem Paciente Auto' }, { key: 'workingHoursOnly', label: 'Apenas Horário Comercial' }].map((item) => (<div key={item.key} className="flex items-center justify-between py-2 border-b"><span className="text-sm">{item.label}</span><button onClick={() => updateSetting(item.key, !settings[item.key])} className={`w-12 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-secondary-400' : 'bg-neutral-300'}`}><div className={`w-5 h-5 bg-card rounded-full shadow transform transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>))}</div>
                {settings.workingHoursOnly && <div className="mt-4 flex gap-4"><Input label="Início" type="time" value={settings.workingHoursStart} onChange={(e) => updateSetting('workingHoursStart', e.target.value)} /><Input label="Fim" type="time" value={settings.workingHoursEnd} onChange={(e) => updateSetting('workingHoursEnd', e.target.value)} /></div>}
            </Card>
            <Card>
                <h3 className="font-semibold mb-4"><Clock className="w-4 h-4 inline mr-2" />Rate Limiting</h3>
                <div className="space-y-4"><div><label className="text-sm text-foreground">Máx. mensagens/minuto: <strong>{settings.maxMessagesPerMinute}</strong></label><input type="range" min="5" max="60" value={settings.maxMessagesPerMinute} onChange={(e) => updateSetting('maxMessagesPerMinute', parseInt(e.target.value))} className="w-full" /></div><div><label className="text-sm text-foreground">Cooldown (seg): <strong>{settings.cooldownSeconds}</strong></label><input type="range" min="1" max="30" value={settings.cooldownSeconds} onChange={(e) => updateSetting('cooldownSeconds', parseInt(e.target.value))} className="w-full" /></div></div>
                <hr className="my-4" /><h4 className="font-semibold mb-2">Stats (24h)</h4><div className="grid grid-cols-2 gap-2 text-sm"><div className="p-2 bg-background rounded">Recebidas: <strong>{stats?.messagesIn24h || 0}</strong></div><div className="p-2 bg-background rounded">Enviadas: <strong>{stats?.messagesOut24h || 0}</strong></div><div className="p-2 bg-background rounded">Fluxos: <strong>{stats?.activeFlows || 0}</strong></div><div className="p-2 bg-background rounded">Cooldowns: <strong>{stats?.cooldowns || 0}</strong></div></div>
            </Card>
            <Card className="lg:col-span-2">
                <h3 className="font-semibold mb-4">Mensagens Padrão</h3>
                <div className="grid md:grid-cols-3 gap-4">{[{ key: 'welcomeMessage', label: 'Boas-vindas' }, { key: 'awayMessage', label: 'Fora do horário' }, { key: 'fallbackMessage', label: 'Fallback' }].map((m) => (<div key={m.key}><label className="text-sm text-foreground block mb-1">{m.label}</label><textarea className="w-full border rounded-lg p-2 text-sm h-24" value={settings[m.key]} onChange={(e) => updateSetting(m.key, e.target.value)} /></div>))}</div>
                {saving && <p className="text-xs text-primary-500 mt-2">Salvando...</p>}
            </Card>
        </div>
    );
}

