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
    Tag, Ban, Bot, ListOrdered, Webhook, Download
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

export default function WhatsAppAdminPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('connection');
    const [dbSchemaStatus, setDbSchemaStatus] = useState<{ ok: boolean; missingColumns: string[] }>({
        ok: true,
        missingColumns: [],
    });

    const tabs = [
        { id: 'connection', label: 'Conexão', icon: Wifi },
        { id: 'chats', label: 'Conversas', icon: MessageCircle },
        { id: 'contacts', label: 'Contatos', icon: Users },
        { id: 'flows', label: 'Fluxos', icon: Zap },
        { id: 'templates', label: 'Templates', icon: FileText },
        { id: 'quickreplies', label: 'Respostas', icon: MessageSquare },
        { id: 'autoreplies', label: 'Auto-Resposta', icon: Bot },
        { id: 'scheduled', label: 'Agendados', icon: Calendar },
        { id: 'broadcast', label: 'Broadcast', icon: Send },
        { id: 'queue', label: 'Fila', icon: ListOrdered },
        { id: 'labels', label: 'Etiquetas', icon: Tag },
        { id: 'blacklist', label: 'Bloqueados', icon: Ban },
        { id: 'webhooks', label: 'Webhooks', icon: Webhook },
        { id: 'analytics', label: 'Relatórios', icon: BarChart3 },
        { id: 'automation', label: 'Automação', icon: Settings },
        { id: 'config', label: 'Backup', icon: Download },
    ];

    useEffect(() => {
        const tabFromQuery = searchParams.get('tab');
        const pathSegment = pathname?.startsWith('/admin/whatsapp/')
            ? pathname.replace('/admin/whatsapp/', '').split('/')[0]
            : '';
        const tabFromUrl = tabFromQuery || pathSegment;
        if (!tabFromUrl) return;
        const normalized = tabFromUrl === 'settings' ? 'automation' : tabFromUrl;
        const exists = tabs.some((tab) => tab.id === normalized);
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
        return () => {
            active = false;
        };
    }, []);

    const handleTabChange = (nextTab: TabType) => {
        setActiveTab(nextTab);
        router.replace(`/admin/whatsapp/${nextTab}`);
    };

    return (
        <div className="p-6 lg:p-8">
            <PageHeader title="Central WhatsApp Enterprise" description="Gestão completa de comunicação, automação e análises" breadcrumbs={[{ label: 'Dashboard', href: '/admin/dashboard' }, { label: 'WhatsApp' }]} />

            {!dbSchemaStatus.ok && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-medium">Database schema drift detectado.</p>
                    <p className="mt-1">Missing columns: {dbSchemaStatus.missingColumns.join(', ') || 'nao informado'}.</p>
                </div>
            )}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => handleTabChange(tab.id as TabType)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
                        <tab.icon className="w-4 h-4" /><span className="hidden lg:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

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
    );
}

// CONNECTION TAB
function ConnectionTab() {
    const [waStatus, setWaStatus] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/whatsapp/status');
            setWaStatus(await res.json());
        } catch (_e) {
            // ignore polling errors
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

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
        if (!confirm('Isso vai encerrar a sessão atual e gerar um novo QR. Deseja continuar?')) return;

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

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                            {isConnected ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-red-600" />}
                        </div>
                        <div>
                            <p className="font-semibold">
                                {isConnected ? 'Conectado'
                                    : waStatus?.status === 'CONNECTING' ? 'Conectando'
                                        : waStatus?.status === 'QR_PENDING' ? 'Aguardando QR'
                                            : waStatus?.status === 'PAIRING_CODE' ? 'Aguardando pareamento'
                                                : 'Desconectado'}
                            </p>
                            {waStatus?.connectedAt && isConnected && <p className="text-sm text-gray-500">Desde {new Date(waStatus.connectedAt).toLocaleString('pt-BR')}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isConnected ? <Button onClick={() => handleAction('connect')} isLoading={actionLoading || isConnecting}><Power className="w-4 h-4" />{isConnecting ? 'Conectando...' : 'Conectar'}</Button>
                            : <Button variant="danger" onClick={() => handleAction('disconnect')} isLoading={actionLoading}><Power className="w-4 h-4" />Desconectar</Button>}
                        <Button variant="outline" onClick={handleResetSession} isLoading={actionLoading} disabled={isConnecting}>
                            <RotateCcw className="w-4 h-4" />Trocar conta
                        </Button>
                    </div>
                </div>
                {waStatus?.status === 'QR_PENDING' && waStatus?.qrCode && (
                    <div className="flex flex-col items-center py-6 border-t"><p className="text-gray-600 mb-4">Escaneie o QR Code:</p><img src={waStatus.qrCode} alt="QR" className="w-56 h-56 border rounded-lg" /></div>
                )}
                {waStatus?.status === 'PAIRING_CODE' && waStatus?.pairingCode && (
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="font-semibold text-indigo-900 mb-1">Codigo de pareamento</p>
                        <p className="text-indigo-700 text-sm mb-3">No WhatsApp: Dispositivos conectados, depois Conectar dispositivo com numero.</p>
                        <code className="bg-gray-900 text-green-400 px-3 py-2 rounded text-lg tracking-widest">{waStatus.pairingCode}</code>
                    </div>
                )}
                {isConnected && <div className="p-4 bg-green-50 rounded-lg">✅ WhatsApp conectado e operacional!</div>}
                {waStatus?.status === 'DISCONNECTED' && !isBridgeOffline && <div className="p-4 bg-blue-50 rounded-lg"><p className="font-semibold text-blue-800 mb-2">ℹ️ Bridge online. Clique em <strong>Conectar</strong> para gerar QR.</p></div>}
                {isBridgeOffline && <div className="p-4 bg-yellow-50 rounded-lg"><p className="font-semibold text-yellow-800 mb-2">⚠️ Comando recomendado: <code className="bg-gray-900 text-green-400 px-2 py-1 rounded">{recommendedCommand}</code></p></div>}
            </Card>
            <Card>
                <h3 className="font-semibold mb-4">Informações do Sistema</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 bg-gray-50 rounded"><span>Número Conectado</span><span className="font-mono">{waStatus?.phone || '-'}</span></div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded"><span>Versão WA</span><span>{waStatus?.version || '-'}</span></div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded"><span>Bateria</span><span>{waStatus?.battery || '-'}%</span></div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded"><span>Plataforma</span><span>{waStatus?.platform || '-'}</span></div>
                </div>
            </Card>
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
    const [search, setSearch] = useState('');

    const fetchContacts = async () => {
        const res = await fetch(`/api/admin/whatsapp/contacts${search ? `?search=${search}` : ''}`);
        if (res.ok) { const data = await res.json(); setContacts(dedupeContacts(data.contacts || [])); }
    };

    const fetchChat = async (phone: string) => {
        const res = await fetch(`/api/admin/whatsapp/chat/${phone}`);
        if (res.ok) { const data = await res.json(); setSelectedChat(data.contact); setMessages(data.messages || []); }
    };

    useEffect(() => { fetchContacts(); }, []);

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        setSending(true);
        await fetch(`/api/admin/whatsapp/chat/${selectedChat.phone}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMessage }),
        });
        setNewMessage('');
        fetchChat(selectedChat.phone);
        setSending(false);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Contacts List */}
            <Card className="!p-0 overflow-hidden">
                <div className="p-3 border-b"><Input placeholder="Buscar..." icon={Search} value={search} onChange={(e) => { setSearch(e.target.value); fetchContacts(); }} /></div>
                <div className="overflow-y-auto h-[calc(70vh-80px)]">
                    {contacts.map((c, index) => (
                        <button key={`${normalizeContactPhone(c.phone) || c.phone || c.telefone || 'contact'}-${index}`} onClick={() => fetchChat(c.phone)} className={`w-full p-3 text-left border-b hover:bg-gray-50 flex items-center gap-3 ${selectedChat?.phone === c.phone ? 'bg-blue-50' : ''}`}>
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{c.name?.charAt(0) || '?'}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.totalMessages} msgs</p>
                            </div>
                            <Badge variant={c.type === 'cuidador' ? 'info' : c.type === 'paciente' ? 'success' : 'default'}>{c.type === 'cuidador' ? 'C' : c.type === 'paciente' ? 'P' : '?'}</Badge>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Chat View */}
            <Card className="lg:col-span-2 !p-0 flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold">{selectedChat.name?.charAt(0)}</div>
                            <div>
                                <p className="font-semibold">{selectedChat.name}</p>
                                <p className="text-xs text-gray-500">{selectedChat.phone}</p>
                            </div>
                            {selectedChat.entityId && <a href={`/admin/${selectedChat.type === 'cuidador' ? 'cuidadores' : 'pacientes'}/${selectedChat.entityId}`} className="ml-auto text-blue-600 flex items-center gap-1 text-sm"><ExternalLink className="w-4 h-4" />Ver Perfil</a>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.direcao === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${msg.direcao === 'OUT' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                                        {msg.flow && <p className="text-xs opacity-70 mb-1">[{msg.flow}/{msg.step}]</p>}
                                        <p>{msg.conteudo}</p>
                                        <p className={`text-xs mt-1 ${msg.direcao === 'OUT' ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.timestamp).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t flex gap-2">
                            <Input placeholder="Digite sua mensagem..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} className="flex-1" />
                            <Button onClick={handleSend} isLoading={sending}><Send className="w-4 h-4" /></Button>
                        </div>
                    </>
                ) : <div className="flex-1 flex items-center justify-center text-gray-500">Selecione uma conversa</div>}
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
                            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded text-sm ${filter === t ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                                {t === 'all' ? 'Todos' : t === 'cuidador' ? 'Cuidadores' : t === 'paciente' ? 'Pacientes' : 'Desconhecidos'}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>
            <Card noPadding>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-4 py-3 text-left">Contato</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-left">Mensagens</th>
                        <th className="px-4 py-3 text-left">Última Interação</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                    </tr></thead>
                    <tbody className="divide-y">
                        {contacts.map((c, index) => (
                            <tr key={`${normalizeContactPhone(c.phone) || c.phone || c.telefone || 'contact'}-${index}`} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><p className="font-medium">{c.name}</p><p className="text-gray-500 font-mono text-xs">{c.phone}</p></td>
                                <td className="px-4 py-3"><Badge variant={c.type === 'cuidador' ? 'info' : c.type === 'paciente' ? 'success' : 'default'}>{c.type}</Badge></td>
                                <td className="px-4 py-3">{c.totalMessages} <span className="text-gray-400">({c.messagesIn}↓ {c.messagesOut}↑)</span></td>
                                <td className="px-4 py-3 text-gray-500">{c.lastMessage ? new Date(c.lastMessage).toLocaleString('pt-BR') : '-'}</td>
                                <td className="px-4 py-3 text-right">
                                    <a href={`https://wa.me/${c.phone}`} target="_blank" className="text-green-600 mr-2">WA</a>
                                    {c.entityId && <a href={`/admin/${c.type === 'cuidador' ? 'cuidadores' : 'pacientes'}/${c.entityId}`} className="text-blue-600">Perfil</a>}
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
                <Card className="!p-4"><p className="text-2xl font-bold text-blue-600">{stats?.totalActive || 0}</p><p className="text-xs text-gray-500">Fluxos Ativos</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-purple-600">{stats?.triagem || 0}</p><p className="text-xs text-gray-500">Triagem</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-green-600">{stats?.avaliacao || 0}</p><p className="text-xs text-gray-500">Avaliação</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-gray-600">{stats?.idle || 0}</p><p className="text-xs text-gray-500">Idle</p></Card>
            </div>
            <Card noPadding>
                <div className="p-4 border-b flex justify-between"><h3 className="font-semibold">Estados dos Fluxos</h3><Button size="sm" variant="outline" onClick={fetchFlows}><RefreshCw className="w-4 h-4" /></Button></div>
                <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Telefone</th><th className="px-4 py-2 text-left">Fluxo</th><th className="px-4 py-2 text-left">Etapa</th><th className="px-4 py-2 text-left">Última</th><th className="px-4 py-2 text-right">Ação</th></tr></thead>
                        <tbody className="divide-y">
                            {flows.map((f) => (
                                <tr key={f.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-mono text-xs">{f.phone}</td>
                                    <td className="px-4 py-2"><Badge variant={f.currentFlow === 'IDLE' ? 'default' : 'info'}>{f.currentFlow}</Badge></td>
                                    <td className="px-4 py-2 text-gray-600">{f.currentStep || '-'}</td>
                                    <td className="px-4 py-2 text-gray-500">{new Date(f.lastInteraction).toLocaleString('pt-BR')}</td>
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
                        <div><label className="text-sm text-gray-600">Categoria</label><select value={newTemplate.category} onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{['onboarding', 'escala', 'comercial', 'feedback', 'financeiro', 'geral'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div className="mb-4"><label className="text-sm text-gray-600">Conteúdo</label><p className="text-xs text-gray-400 mb-1">Use {'{{variavel}}'} para dados dinâmicos</p><textarea className="w-full border rounded-lg p-3 h-32" value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} /></div>
                    <div className="flex gap-2"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                    <Card key={t.id} className="hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <div><p className="font-semibold">{t.name}</p><Badge variant="purple">{t.category}</Badge></div>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{t.content}</p>
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
                        <div className="md:col-span-2"><label className="text-sm text-gray-600">Conteúdo</label><textarea className="w-full border rounded-lg p-2 mt-1 h-16" value={newReply.content} onChange={(e) => setNewReply({ ...newReply, content: e.target.value })} /></div>
                    </div>
                    <div className="flex gap-2 mt-4"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {replies.map((r) => (
                    <Card key={r.id} className="flex items-start gap-3">
                        <code className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{r.shortcut}</code>
                        <p className="flex-1 text-sm text-gray-600">{r.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><X className="w-4 h-4 text-red-500" /></Button>
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
                    <div className="mb-4"><label className="text-sm text-gray-600">Mensagem</label><textarea className="w-full border rounded-lg p-3 h-24 mt-1" value={newMsg.message} onChange={(e) => setNewMsg({ ...newMsg, message: e.target.value })} /></div>
                    <div className="flex gap-2"><Button onClick={handleAdd}>Agendar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <Card noPadding>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3 text-left">Mensagem</th><th className="px-4 py-3 text-left">Agendado Para</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
                    <tbody className="divide-y">
                        {scheduled.map((s) => (
                            <tr key={s.id}><td className="px-4 py-3 font-mono">{s.phone}</td><td className="px-4 py-3 text-gray-600 truncate max-w-xs">{s.message}</td><td className="px-4 py-3">{new Date(s.scheduledAt).toLocaleString('pt-BR')}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td></tr>
                        ))}
                    </tbody>
                </table>
                {scheduled.length === 0 && <p className="p-8 text-center text-gray-500">Nenhuma mensagem agendada</p>}
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
                <div className="mb-4"><label className="text-sm text-gray-600 block mb-2">Destinatários</label><div className="flex flex-wrap gap-2">{[{ id: 'cuidadores', label: 'Cuidadores' }, { id: 'pacientes', label: 'Pacientes' }, { id: 'leads', label: 'Leads' }, { id: 'custom', label: 'Personalizado' }].map((opt) => (<button key={opt.id} onClick={() => setTargetType(opt.id as any)} className={`px-3 py-2 rounded-lg text-sm ${targetType === opt.id ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100'} border`}>{opt.label}</button>))}</div></div>
                {targetType === 'custom' && <div className="mb-4"><textarea className="w-full border rounded-lg p-2 h-24 font-mono text-sm" value={customPhones} onChange={(e) => setCustomPhones(e.target.value)} placeholder="5511999999999&#10;5521888888888" /></div>}
                <div className="mb-4"><label className="text-sm text-gray-600">Mensagem</label><textarea className="w-full border rounded-lg p-3 h-32 mt-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Digite..." /><p className="text-xs text-gray-400 mt-1">{message.length} caracteres</p></div>
                <Button onClick={handleSend} isLoading={sending} className="w-full"><Send className="w-4 h-4" />Enviar</Button>
                {result && <div className={`mt-4 p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{result.success ? `✅ ${result.message}` : `❌ ${result.error}`}</div>}
            </Card>
            <Card>
                <h3 className="font-semibold mb-4">Templates Rápidos</h3>
                <div className="space-y-2">{[{ name: 'Lembrete Plantão', text: 'Olá! Lembrando do seu plantão amanhã. Confirme com OK.' }, { name: 'Aviso Geral', text: 'Atenção equipe! Temos novidades importantes.' }, { name: 'Pesquisa', text: 'Olá! Gostaríamos de saber sua opinião...' }].map((tpl) => (<button key={tpl.name} onClick={() => setMessage(tpl.text)} className="w-full text-left p-3 rounded-lg border hover:bg-gray-50"><p className="font-medium text-sm">{tpl.name}</p><p className="text-xs text-gray-500 truncate">{tpl.text}</p></button>))}</div>
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
                <div className="flex gap-1">{['24h', '7d', '30d'].map((p) => (<button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 rounded text-sm ${period === p ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>{p}</button>))}</div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="!p-4"><p className="text-2xl font-bold text-blue-600">{data.summary?.totalMessages || 0}</p><p className="text-xs text-gray-500">Total Mensagens</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-green-600">{data.summary?.messagesIn || 0}</p><p className="text-xs text-gray-500">Recebidas</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-purple-600">{data.summary?.messagesOut || 0}</p><p className="text-xs text-gray-500">Enviadas</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-orange-600">{data.summary?.uniqueContacts || 0}</p><p className="text-xs text-gray-500">Contatos Únicos</p></Card>
                <Card className="!p-4"><p className="text-2xl font-bold text-cyan-600">{data.summary?.responseRate || 0}%</p><p className="text-xs text-gray-500">Taxa Resposta</p></Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                <Card><h3 className="font-semibold mb-4">Mensagens por Fluxo</h3><div className="space-y-2">{data.messagesByFlow?.map((f: any) => (<div key={f.flow} className="flex justify-between items-center p-2 bg-gray-50 rounded"><span>{f.flow}</span><Badge>{f.count}</Badge></div>))}</div></Card>
                <Card><h3 className="font-semibold mb-4">Horários de Pico</h3><div className="space-y-2">{data.peakHours?.map((h: any) => (<div key={h.hour} className="flex justify-between items-center p-2 bg-gray-50 rounded"><span>{h.hour}:00</span><Badge variant="info">{h.count} msgs</Badge></div>))}</div></Card>
            </div>
            <Card><h3 className="font-semibold mb-4">Conversões</h3><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-purple-50 rounded-lg text-center"><p className="text-2xl font-bold text-purple-600">{data.flowStats?.triagemStarted || 0}</p><p className="text-sm text-gray-600">Triagens Iniciadas</p></div><div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-600">{data.flowStats?.completed || 0}</p><p className="text-sm text-gray-600">Aprovados no Período</p></div></div></Card>
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
                <div className="space-y-4">{[{ key: 'autoReplyEnabled', label: 'Respostas Automáticas' }, { key: 'autoTriagemCuidador', label: 'Triagem Cuidador Auto' }, { key: 'autoTriagemPaciente', label: 'Triagem Paciente Auto' }, { key: 'workingHoursOnly', label: 'Apenas Horário Comercial' }].map((item) => (<div key={item.key} className="flex items-center justify-between py-2 border-b"><span className="text-sm">{item.label}</span><button onClick={() => updateSetting(item.key, !settings[item.key])} className={`w-12 h-6 rounded-full transition-colors ${settings[item.key] ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} /></button></div>))}</div>
                {settings.workingHoursOnly && <div className="mt-4 flex gap-4"><Input label="Início" type="time" value={settings.workingHoursStart} onChange={(e) => updateSetting('workingHoursStart', e.target.value)} /><Input label="Fim" type="time" value={settings.workingHoursEnd} onChange={(e) => updateSetting('workingHoursEnd', e.target.value)} /></div>}
            </Card>
            <Card>
                <h3 className="font-semibold mb-4"><Clock className="w-4 h-4 inline mr-2" />Rate Limiting</h3>
                <div className="space-y-4"><div><label className="text-sm text-gray-600">Máx. mensagens/minuto: <strong>{settings.maxMessagesPerMinute}</strong></label><input type="range" min="5" max="60" value={settings.maxMessagesPerMinute} onChange={(e) => updateSetting('maxMessagesPerMinute', parseInt(e.target.value))} className="w-full" /></div><div><label className="text-sm text-gray-600">Cooldown (seg): <strong>{settings.cooldownSeconds}</strong></label><input type="range" min="1" max="30" value={settings.cooldownSeconds} onChange={(e) => updateSetting('cooldownSeconds', parseInt(e.target.value))} className="w-full" /></div></div>
                <hr className="my-4" /><h4 className="font-semibold mb-2">Stats (24h)</h4><div className="grid grid-cols-2 gap-2 text-sm"><div className="p-2 bg-gray-50 rounded">Recebidas: <strong>{stats?.messagesIn24h || 0}</strong></div><div className="p-2 bg-gray-50 rounded">Enviadas: <strong>{stats?.messagesOut24h || 0}</strong></div><div className="p-2 bg-gray-50 rounded">Fluxos: <strong>{stats?.activeFlows || 0}</strong></div><div className="p-2 bg-gray-50 rounded">Cooldowns: <strong>{stats?.cooldowns || 0}</strong></div></div>
            </Card>
            <Card className="lg:col-span-2">
                <h3 className="font-semibold mb-4">Mensagens Padrão</h3>
                <div className="grid md:grid-cols-3 gap-4">{[{ key: 'welcomeMessage', label: 'Boas-vindas' }, { key: 'awayMessage', label: 'Fora do horário' }, { key: 'fallbackMessage', label: 'Fallback' }].map((m) => (<div key={m.key}><label className="text-sm text-gray-600 block mb-1">{m.label}</label><textarea className="w-full border rounded-lg p-2 text-sm h-24" value={settings[m.key]} onChange={(e) => updateSetting(m.key, e.target.value)} /></div>))}</div>
                {saving && <p className="text-xs text-blue-500 mt-2">Salvando...</p>}
            </Card>
        </div>
    );
}

