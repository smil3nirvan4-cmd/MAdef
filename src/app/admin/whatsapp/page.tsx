'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    Tag, Ban, Bot, ListOrdered, Webhook, Download, Layout, Radio, Megaphone, Shield,
    Smile, Paperclip, Image, Mic, File, Reply, Check, CheckCheck, MicOff,
    Volume2, ArrowDown
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

// EMOJI DATA - common emojis grouped by category
const EMOJI_CATEGORIES = [
    { label: 'Frequentes', emojis: ['😀','😂','❤️','👍','🙏','😊','🎉','👋','✅','⭐','🔥','💪','😍','🤝','👏','💯','🙂','😢','🤔','😁'] },
    { label: 'Rostos', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱'] },
    { label: 'Gestos', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','🦾','🖊️'] },
    { label: 'Objetos', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','💫','🔥','💥','🎉','🎊','🎈','📱','💻','📷','🎵','🎶','📝','📎','📌','🔔','💰','💵','🏥','💊','🩺','🏠'] },
];

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
    const [activeCategory, setActiveCategory] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl w-80 z-50">
            {/* Category tabs */}
            <div className="flex border-b border-border px-2 pt-2 gap-1">
                {EMOJI_CATEGORIES.map((cat, i) => (
                    <button key={cat.label} onClick={() => setActiveCategory(i)}
                        className={`px-2 py-1.5 text-xs rounded-t-md transition-colors ${activeCategory === i ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-surface-subtle'}`}>
                        {cat.label}
                    </button>
                ))}
            </div>
            {/* Emoji grid */}
            <div className="p-2 h-48 overflow-y-auto">
                <div className="grid grid-cols-8 gap-0.5">
                    {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
                        <button key={`${emoji}-${i}`} onClick={() => { onSelect(emoji); onClose(); }}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-surface-subtle rounded-md transition-colors">
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// CHATS TAB - Full conversation view with complete messaging features
function ChatsTab() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [filePreview, setFilePreview] = useState<{ name: string; type: string; base64: string; size: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // Close attach menu on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchContacts = async () => {
        const res = await fetch(`/api/admin/whatsapp/contacts${search ? `?search=${search}` : ''}`);
        if (res.ok) { const data = await res.json(); setContacts(dedupeContacts(data.contacts || [])); }
    };

    const fetchChat = async (phone: string) => {
        const res = await fetch(`/api/admin/whatsapp/chat/${phone}`);
        if (res.ok) {
            const data = await res.json();
            setSelectedChat(data.contact);
            setMessages(data.messages || []);
            setReplyTo(null);
        }
    };

    useEffect(() => { fetchContacts(); }, []);

    // Auto-refresh messages for selected chat
    useEffect(() => {
        if (!selectedChat?.phone) return;
        const interval = setInterval(() => fetchChat(selectedChat.phone), 8000);
        return () => clearInterval(interval);
    }, [selectedChat?.phone]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [newMessage]);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        setSending(true);
        setSendError(null);
        try {
            const messageText = replyTo
                ? `> ${replyTo.conteudo?.substring(0, 60)}${replyTo.conteudo?.length > 60 ? '...' : ''}\n\n${newMessage}`
                : newMessage;

            const res = await fetch(`/api/admin/whatsapp/chat/${selectedChat.phone}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, type: 'text' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!data.success && res.status !== 202) {
                setSendError(data.error || `Falha ao enviar (status: ${data.status || res.status})`);
            }
            setNewMessage('');
            setReplyTo(null);
            fetchChat(selectedChat.phone);
        } catch (_err) {
            setSendError('Erro de conexao ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    const handleSendMedia = async (fileBase64: string, fileName: string, mimeType: string, caption?: string) => {
        if (!selectedChat) return;
        setSending(true);
        setSendError(null);
        try {
            const mediaType = mimeType.startsWith('image/') ? 'image'
                : mimeType.startsWith('audio/') ? 'audio'
                    : 'document';

            const res = await fetch(`/api/admin/whatsapp/chat/${selectedChat.phone}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: mediaType, fileBase64, fileName, mimeType, caption: caption || '' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!data.success && res.status !== 202) {
                setSendError(data.error || 'Falha ao enviar midia');
            }
            setFilePreview(null);
            fetchChat(selectedChat.phone);
        } catch (_err) {
            setSendError('Erro de conexao ao enviar midia');
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = type === 'image' ? 5 * 1024 * 1024 : 16 * 1024 * 1024; // 5MB images, 16MB docs
        if (file.size > maxSize) {
            setSendError(`Arquivo muito grande. Maximo: ${type === 'image' ? '5MB' : '16MB'}`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            const sizeKB = (file.size / 1024).toFixed(1);
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const sizeLabel = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

            setFilePreview({ name: file.name, type: file.type, base64, size: sizeLabel });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
        setShowAttachMenu(false);
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    handleSendMedia(base64, `audio_${Date.now()}.webm`, 'audio/webm');
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch (_err) {
            setSendError('Nao foi possivel acessar o microfone');
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const handleCancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            setIsRecording(false);
            setRecordingTime(0);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const handleRefreshContacts = async () => {
        setRefreshing(true);
        await fetchContacts();
        setRefreshing(false);
    };

    const formatRecordingTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getLastMessagePreview = (contact: any) => {
        if (contact.lastMessageContent) return contact.lastMessageContent;
        if (contact.totalMessages > 0) return `${contact.totalMessages} mensagens`;
        return 'Sem mensagens';
    };

    const formatMessageTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (isYesterday) return 'Ontem';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const isMediaMessage = (content: string) => {
        return content?.startsWith('[Imagem]') || content?.startsWith('[Audio]') || content?.startsWith('[Documento]');
    };

    return (
        <div className="grid lg:grid-cols-3 gap-0 h-[78vh] border border-border rounded-xl overflow-hidden">
            {/* Contacts List */}
            <div className="bg-card border-r border-border flex flex-col">
                <div className="p-3 border-b border-border bg-card">
                    <div className="flex gap-2">
                        <Input placeholder="Buscar contato..." icon={Search} value={search}
                            onChange={(e) => { setSearch(e.target.value); fetchContacts(); }} className="flex-1" />
                        <button onClick={handleRefreshContacts} className="p-2 rounded-md hover:bg-surface-subtle" title="Atualizar contatos">
                            <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.length === 0 && (
                        <div className="p-8 text-center">
                            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum contato encontrado</p>
                        </div>
                    )}
                    {contacts.map((c, index) => (
                        <button key={`${normalizeContactPhone(c.phone) || c.phone || c.telefone || 'contact'}-${index}`}
                            onClick={() => fetchChat(c.phone)}
                            className={`w-full px-3 py-3 text-left border-b border-border/30 hover:bg-surface-subtle flex items-center gap-3 transition-colors ${
                                selectedChat?.phone === c.phone ? 'bg-primary/5 border-l-3 border-l-primary' : ''
                            }`}>
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                                c.type === 'cuidador' ? 'bg-blue-500' : c.type === 'paciente' ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}>
                                {c.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <p className="font-medium truncate text-foreground text-sm">{c.name || 'Desconhecido'}</p>
                                    {c.lastMessage && (
                                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                                            {formatMessageTime(c.lastMessage)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-xs text-muted-foreground truncate">{getLastMessagePreview(c)}</p>
                                    {c.totalMessages > 0 && (
                                        <Badge variant={c.type === 'cuidador' ? 'info' : c.type === 'paciente' ? 'success' : 'default'} className="text-[9px] ml-1 flex-shrink-0">
                                            {c.totalMessages}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat View */}
            <div className="lg:col-span-2 flex flex-col bg-background/30">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                                selectedChat.type === 'cuidador' ? 'bg-blue-500' : selectedChat.type === 'paciente' ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}>
                                {selectedChat.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate text-foreground">{selectedChat.name || 'Desconhecido'}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground font-mono">{selectedChat.phone}</p>
                                    {selectedChat.flowState?.currentFlow && selectedChat.flowState.currentFlow !== 'IDLE' && (
                                        <Badge variant="warning" className="text-[9px]">{selectedChat.flowState.currentFlow}</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => fetchChat(selectedChat.phone)}
                                    className="p-2 rounded-md hover:bg-surface-subtle transition-colors" title="Atualizar conversa">
                                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                                </button>
                                {selectedChat.entityId && (
                                    <a href={`/admin/${selectedChat.type === 'cuidador' ? 'cuidadores' : 'pacientes'}/${selectedChat.entityId}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors border border-primary/20">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="hidden xl:inline">Ver Perfil</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                    <MessageCircle className="w-16 h-16 opacity-20" />
                                    <p className="text-sm">Nenhuma mensagem nesta conversa</p>
                                    <p className="text-xs">Envie a primeira mensagem abaixo</p>
                                </div>
                            )}
                            {messages.map((msg, idx) => {
                                const isOut = msg.direcao === 'OUT';
                                const isFailed = msg.direcao === 'OUT_FAILED';
                                const isPending = msg.direcao === 'OUT_PENDING';
                                const isOutbound = isOut || isFailed || isPending;
                                const isMedia = isMediaMessage(msg.conteudo);

                                // Date separator
                                const msgDate = new Date(msg.timestamp).toLocaleDateString('pt-BR');
                                const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].timestamp).toLocaleDateString('pt-BR') : null;
                                const showDateSeparator = msgDate !== prevMsgDate;

                                return (
                                    <div key={msg.id}>
                                        {showDateSeparator && (
                                            <div className="flex items-center justify-center my-3">
                                                <span className="px-3 py-1 bg-card border border-border rounded-full text-[10px] text-muted-foreground shadow-sm">
                                                    {new Date(msg.timestamp).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}>
                                            <div className={`relative max-w-[70%] px-3 py-2 rounded-xl text-sm shadow-sm ${
                                                isOut ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : isFailed ? 'bg-error-50 text-error-700 border border-error-200 rounded-br-sm'
                                                        : isPending ? 'bg-warning-50 text-warning-700 border border-warning-200 rounded-br-sm'
                                                            : 'bg-card border border-border/60 rounded-bl-sm'
                                            }`}>
                                                {/* Reply action button */}
                                                <button onClick={() => setReplyTo(msg)}
                                                    className={`absolute ${isOutbound ? '-left-8' : '-right-8'} top-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-subtle`}
                                                    title="Responder">
                                                    <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                                                </button>

                                                {/* Flow indicator */}
                                                {msg.flow && msg.flow !== 'MANUAL' && (
                                                    <p className="text-[9px] opacity-50 mb-1 font-mono flex items-center gap-1">
                                                        <Bot className="w-3 h-3" />{msg.flow}/{msg.step}
                                                    </p>
                                                )}

                                                {/* Media indicator */}
                                                {isMedia && (
                                                    <div className={`flex items-center gap-1.5 mb-1 text-xs ${isOut ? 'text-primary-200' : 'text-muted-foreground'}`}>
                                                        {msg.conteudo.startsWith('[Imagem]') && <Image className="w-3.5 h-3.5" />}
                                                        {msg.conteudo.startsWith('[Audio]') && <Volume2 className="w-3.5 h-3.5" />}
                                                        {msg.conteudo.startsWith('[Documento]') && <File className="w-3.5 h-3.5" />}
                                                    </div>
                                                )}

                                                {/* Message content */}
                                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.conteudo}</p>

                                                {/* Timestamp and status */}
                                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                                    {isFailed && <span className="text-[9px] text-error-500 font-medium">Falhou</span>}
                                                    {isPending && <span className="text-[9px] text-warning-500 font-medium">Pendente</span>}
                                                    <p className={`text-[10px] ${isOut ? 'text-primary-200' : 'text-muted-foreground'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {isOut && <CheckCheck className={`w-3 h-3 ${isOut ? 'text-primary-200' : 'text-muted-foreground'}`} />}
                                                    {isPending && <Check className="w-3 h-3 text-warning-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply preview bar */}
                        {replyTo && (
                            <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-3">
                                <div className="w-1 h-8 bg-primary rounded-full flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-primary font-medium">Respondendo</p>
                                    <p className="text-xs text-muted-foreground truncate">{replyTo.conteudo?.substring(0, 80)}</p>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-surface-subtle rounded-md">
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        )}

                        {/* File preview bar */}
                        {filePreview && (
                            <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    filePreview.type.startsWith('image/') ? 'bg-blue-50' : filePreview.type.startsWith('audio/') ? 'bg-emerald-50' : 'bg-orange-50'
                                }`}>
                                    {filePreview.type.startsWith('image/') ? <Image className="w-5 h-5 text-blue-500" /> :
                                        filePreview.type.startsWith('audio/') ? <Volume2 className="w-5 h-5 text-emerald-500" /> :
                                            <File className="w-5 h-5 text-orange-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">{filePreview.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{filePreview.size} - {filePreview.type.split('/')[1]?.toUpperCase()}</p>
                                </div>
                                <Button size="sm" onClick={() => handleSendMedia(filePreview.base64, filePreview.name, filePreview.type)} isLoading={sending}>
                                    <Send className="w-3.5 h-3.5" />Enviar
                                </Button>
                                <button onClick={() => setFilePreview(null)} className="p-1 hover:bg-surface-subtle rounded-md">
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        )}

                        {/* Error bar */}
                        {sendError && (
                            <div className="px-4 py-2 bg-error-50 border-t border-error-200 flex items-center justify-between">
                                <span className="text-xs text-error-700">{sendError}</span>
                                <button onClick={() => setSendError(null)} className="ml-2 text-error-400 hover:text-error-700">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Message Input Area */}
                        <div className="px-3 py-2 border-t border-border bg-card">
                            {isRecording ? (
                                /* Recording UI */
                                <div className="flex items-center gap-3 py-1">
                                    <button onClick={handleCancelRecording}
                                        className="p-2 rounded-full hover:bg-error-50 text-error-500 transition-colors" title="Cancelar">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 bg-error-500 rounded-full animate-pulse" />
                                        <span className="text-sm text-error-600 font-mono font-medium">{formatRecordingTime(recordingTime)}</span>
                                        <div className="flex-1 h-1 bg-error-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-error-500 rounded-full animate-pulse" style={{ width: `${Math.min(recordingTime * 2, 100)}%` }} />
                                        </div>
                                    </div>
                                    <button onClick={handleStopRecording}
                                        className="p-3 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors shadow-md" title="Enviar audio">
                                        <Send className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                /* Normal input UI */
                                <div className="flex items-end gap-2">
                                    {/* Emoji button */}
                                    <div className="relative flex-shrink-0">
                                        <button onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false); }}
                                            className={`p-2 rounded-full transition-colors ${showEmoji ? 'bg-primary/10 text-primary' : 'hover:bg-surface-subtle text-muted-foreground'}`}
                                            title="Emojis">
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showEmoji && (
                                            <EmojiPicker
                                                onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                                                onClose={() => setShowEmoji(false)}
                                            />
                                        )}
                                    </div>

                                    {/* Attachment button */}
                                    <div className="relative flex-shrink-0" ref={attachMenuRef}>
                                        <button onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false); }}
                                            className={`p-2 rounded-full transition-colors ${showAttachMenu ? 'bg-primary/10 text-primary rotate-45' : 'hover:bg-surface-subtle text-muted-foreground'}`}
                                            title="Anexar arquivo">
                                            <Plus className="w-5 h-5 transition-transform" />
                                        </button>
                                        {showAttachMenu && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl py-2 w-48 z-50">
                                                <button onClick={() => imageInputRef.current?.click()}
                                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                        <Image className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <span className="text-foreground">Foto</span>
                                                </button>
                                                <button onClick={() => fileInputRef.current?.click()}
                                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
                                                        <File className="w-4 h-4 text-orange-500" />
                                                    </div>
                                                    <span className="text-foreground">Documento</span>
                                                </button>
                                                <button onClick={() => audioInputRef.current?.click()}
                                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-subtle flex items-center gap-3 transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                        <Volume2 className="w-4 h-4 text-emerald-500" />
                                                    </div>
                                                    <span className="text-foreground">Audio</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hidden file inputs */}
                                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                                        onChange={(e) => handleFileSelect(e, 'image')} />
                                    <input ref={fileInputRef} type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" className="hidden"
                                        onChange={(e) => handleFileSelect(e, 'document')} />
                                    <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
                                        onChange={(e) => handleFileSelect(e, 'audio')} />

                                    {/* Text input */}
                                    <div className="flex-1 relative">
                                        <textarea
                                            ref={textareaRef}
                                            placeholder="Digite uma mensagem..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                }
                                            }}
                                            rows={1}
                                            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all max-h-[120px]"
                                        />
                                    </div>

                                    {/* Send / Record button */}
                                    {newMessage.trim() ? (
                                        <button onClick={handleSend} disabled={sending}
                                            className="p-2.5 rounded-full bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 flex-shrink-0"
                                            title="Enviar mensagem">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button onClick={handleStartRecording}
                                            className="p-2.5 rounded-full hover:bg-surface-subtle text-muted-foreground transition-colors flex-shrink-0"
                                            title="Gravar audio">
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                            <MessageCircle className="w-10 h-10 text-primary/30" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-foreground">Central de Mensagens</p>
                            <p className="text-sm mt-1">Selecione uma conversa para comecar</p>
                        </div>
                    </div>
                )}
            </div>
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

