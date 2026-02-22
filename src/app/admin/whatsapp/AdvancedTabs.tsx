'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, X, RefreshCw, Download, Upload, Check } from 'lucide-react';

// LABELS TAB
export function LabelsTab() {
    const [labels, setLabels] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newLabel, setNewLabel] = useState({ name: '', color: '#3B82F6', description: '' });

    const fetch_ = async () => { const res = await fetch('/api/admin/whatsapp/labels'); if (res.ok) setLabels((await res.json()).labels || []); };
    useEffect(() => { fetch_(); }, []);

    const handleAdd = async () => { await fetch('/api/admin/whatsapp/labels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLabel) }); setNewLabel({ name: '', color: '#3B82F6', description: '' }); setShowAdd(false); fetch_(); };
    const handleDelete = async (id: string) => { await fetch(`/api/admin/whatsapp/labels?id=${id}`, { method: 'DELETE' }); fetch_(); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-semibold">Etiquetas / Tags</h2><Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Nova Etiqueta</Button></div>
            {showAdd && (
                <Card>
                    <div className="grid md:grid-cols-4 gap-4">
                        <Input label="Nome" value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} />
                        <div><label className="text-sm text-foreground">Cor</label><input type="color" value={newLabel.color} onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })} className="w-full h-10 rounded border mt-1" /></div>
                        <Input label="Descrição" value={newLabel.description} onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })} className="md:col-span-2" />
                    </div>
                    <div className="flex gap-2 mt-4"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {labels.map((l) => (
                    <Card key={l.id} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color }} />
                        <div className="flex-1"><p className="font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.description}</p></div>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id)}><X className="w-4 h-4 text-error-500" /></Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// BLACKLIST TAB
export function BlacklistTab() {
    const [list, setList] = useState<any[]>([]);
    const [newPhone, setNewPhone] = useState('');
    const [reason, setReason] = useState('');

    const fetch_ = async () => { const res = await fetch('/api/admin/whatsapp/blacklist'); if (res.ok) setList((await res.json()).blacklist || []); };
    useEffect(() => { fetch_(); }, []);

    const handleAdd = async () => { if (!newPhone) return; await fetch('/api/admin/whatsapp/blacklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: newPhone, reason }) }); setNewPhone(''); setReason(''); fetch_(); };
    const handleRemove = async (phone: string) => { await fetch(`/api/admin/whatsapp/blacklist?phone=${phone}`, { method: 'DELETE' }); fetch_(); };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="font-semibold mb-4">Adicionar à Lista Negra</h3>
                <div className="flex gap-4">
                    <Input placeholder="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-48" />
                    <Input placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" />
                    <Button onClick={handleAdd}><Plus className="w-4 h-4" />Bloquear</Button>
                </div>
            </Card>
            <Card noPadding>
                <table className="w-full text-sm">
                    <thead className="bg-background"><tr><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3 text-left">Motivo</th><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
                    <tbody className="divide-y">
                        {list.map((b) => (<tr key={b.phone}><td className="px-4 py-3 font-mono">{b.phone}</td><td className="px-4 py-3 text-foreground">{b.reason || '-'}</td><td className="px-4 py-3 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString('pt-BR')}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => handleRemove(b.phone)}><Trash2 className="w-4 h-4 text-error-500" /></Button></td></tr>))}
                    </tbody>
                </table>
                {list.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum número bloqueado</p>}
            </Card>
        </div>
    );
}

// AUTO-REPLIES TAB
export function AutoRepliesTab() {
    const [rules, setRules] = useState<any[]>([]);
    const [triggerTypes, setTriggerTypes] = useState<string[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newRule, setNewRule] = useState({ name: '', trigger: '', triggerType: 'contains', response: '', priority: 1 });

    const fetch_ = async () => { const res = await fetch('/api/admin/whatsapp/autoreplies'); if (res.ok) { const d = await res.json(); setRules(d.rules || []); setTriggerTypes(d.triggerTypes || []); } };
    useEffect(() => { fetch_(); }, []);

    const handleAdd = async () => { await fetch('/api/admin/whatsapp/autoreplies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRule) }); setNewRule({ name: '', trigger: '', triggerType: 'contains', response: '', priority: 1 }); setShowAdd(false); fetch_(); };
    const handleToggle = async (id: string, active: boolean) => { await fetch('/api/admin/whatsapp/autoreplies', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) }); fetch_(); };
    const handleDelete = async (id: string) => { await fetch(`/api/admin/whatsapp/autoreplies?id=${id}`, { method: 'DELETE' }); fetch_(); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-semibold">Regras de Auto-Resposta</h2><Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Nova Regra</Button></div>
            {showAdd && (
                <Card>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Input label="Nome" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
                        <div><label className="text-sm text-foreground">Tipo de Trigger</label><select value={newRule.triggerType} onChange={(e) => setNewRule({ ...newRule, triggerType: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1">{triggerTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    <Input label="Trigger (palavras separadas por |)" value={newRule.trigger} onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })} className="mb-4" />
                    <div className="mb-4"><label className="text-sm text-foreground">Resposta</label><textarea className="w-full border border-border-hover rounded-md p-3 h-24 mt-1 focus:outline-none focus:ring-2 focus:ring-ring" value={newRule.response} onChange={(e) => setNewRule({ ...newRule, response: e.target.value })} /></div>
                    <div className="flex gap-2"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="space-y-3">
                {rules.map((r) => (
                    <Card key={r.id} className="flex items-start gap-4">
                        <button onClick={() => handleToggle(r.id, !r.active)} className={`w-12 h-6 rounded-full ${r.active ? 'bg-secondary-400' : 'bg-neutral-300'} flex-shrink-0`}><div className={`w-5 h-5 bg-card rounded-full shadow transform ${r.active ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold">{r.name}</p>
                            <p className="text-xs text-muted-foreground"><Badge variant="info">{r.triggerType}</Badge> {r.trigger}</p>
                            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{r.response}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-error-500" /></Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// QUEUE TAB
export function QueueTab() {
    const [queue, setQueue] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [filter, setFilter] = useState('pending');
    const [selected, setSelected] = useState<string[]>([]);

    const fetch_ = async () => { const res = await fetch(`/api/admin/whatsapp/queue?status=${filter}`); if (res.ok) { const d = await res.json(); setQueue(d.queue || []); setStats(d.stats); } };
    useEffect(() => { fetch_(); }, [filter]);

    const handleAction = async (action: string) => { await fetch('/api/admin/whatsapp/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids: selected }) }); setSelected([]); fetch_(); };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <Card className="!p-4 cursor-pointer" onClick={() => setFilter('pending')}><p className="text-2xl font-bold text-warning-600">{stats?.pending || 0}</p><p className="text-xs text-muted-foreground">Pendentes</p></Card>
                <Card className="!p-4 cursor-pointer" onClick={() => setFilter('sent')}><p className="text-2xl font-bold text-success-600">{stats?.sent || 0}</p><p className="text-xs text-muted-foreground">Enviados</p></Card>
                <Card className="!p-4 cursor-pointer" onClick={() => setFilter('failed')}><p className="text-2xl font-bold text-error-600">{stats?.failed || 0}</p><p className="text-xs text-muted-foreground">Falhas</p></Card>
            </div>
            <Card className="!p-4 flex gap-4 items-center">
                <span className="text-sm">{selected.length} selecionados</span>
                {filter === 'failed' && <Button size="sm" onClick={() => handleAction('retry')} disabled={!selected.length}><RefreshCw className="w-4 h-4" />Reenviar</Button>}
                {filter === 'pending' && <Button size="sm" variant="danger" onClick={() => handleAction('cancel')} disabled={!selected.length}><X className="w-4 h-4" />Cancelar</Button>}
                {filter === 'failed' && <Button size="sm" variant="danger" onClick={() => handleAction('clear_failed')}><Trash2 className="w-4 h-4" />Limpar Falhas</Button>}
                <Button size="sm" variant="outline" onClick={fetch_} className="ml-auto"><RefreshCw className="w-4 h-4" /></Button>
            </Card>
            <Card noPadding>
                <table className="w-full text-sm">
                    <thead className="bg-background"><tr><th className="px-4 py-3 w-10"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? queue.map(q => q.id) : [])} /></th><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3 text-left">Mensagem</th><th className="px-4 py-3 text-left">Data</th></tr></thead>
                    <tbody className="divide-y">
                        {queue.map((q) => (<tr key={q.id} className="hover:bg-background"><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(q.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, q.id] : selected.filter(s => s !== q.id))} /></td><td className="px-4 py-3 font-mono text-xs">{q.telefone?.replace('@s.whatsapp.net', '')}</td><td className="px-4 py-3 text-foreground truncate max-w-xs">{q.conteudo}</td><td className="px-4 py-3 text-muted-foreground">{new Date(q.timestamp).toLocaleString('pt-BR')}</td></tr>))}
                    </tbody>
                </table>
                {queue.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhuma mensagem na fila</p>}
            </Card>
        </div>
    );
}

// WEBHOOKS TAB
export function WebhooksTab() {
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [events, setEvents] = useState<string[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newWH, setNewWH] = useState({ name: '', url: '', events: [] as string[], secret: '' });

    const fetch_ = async () => { const res = await fetch('/api/admin/whatsapp/webhooks'); if (res.ok) { const d = await res.json(); setWebhooks(d.webhooks || []); setEvents(d.events || []); } };
    useEffect(() => { fetch_(); }, []);

    const handleAdd = async () => { await fetch('/api/admin/whatsapp/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newWH) }); setNewWH({ name: '', url: '', events: [], secret: '' }); setShowAdd(false); fetch_(); };
    const handleToggle = async (id: string, active: boolean) => { await fetch('/api/admin/whatsapp/webhooks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) }); fetch_(); };
    const handleDelete = async (id: string) => { await fetch(`/api/admin/whatsapp/webhooks?id=${id}`, { method: 'DELETE' }); fetch_(); };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h2 className="font-semibold">Webhooks</h2><Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Novo Webhook</Button></div>
            {showAdd && (
                <Card>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <Input label="Nome" value={newWH.name} onChange={(e) => setNewWH({ ...newWH, name: e.target.value })} />
                        <Input label="URL" value={newWH.url} onChange={(e) => setNewWH({ ...newWH, url: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="mb-4"><label className="text-sm text-foreground">Eventos</label><div className="flex flex-wrap gap-2 mt-2">{events.map(e => (<button key={e} onClick={() => setNewWH({ ...newWH, events: newWH.events.includes(e) ? newWH.events.filter(x => x !== e) : [...newWH.events, e] })} className={`px-3 py-1 rounded text-sm ${newWH.events.includes(e) ? 'bg-primary-100 text-primary' : 'bg-surface-subtle text-foreground'}`}>{e}</button>))}</div></div>
                    <Input label="Secret (opcional)" value={newWH.secret} onChange={(e) => setNewWH({ ...newWH, secret: e.target.value })} className="mb-4" />
                    <div className="flex gap-2"><Button onClick={handleAdd}>Salvar</Button><Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
                </Card>
            )}
            <div className="space-y-3">
                {webhooks.map((wh) => (
                    <Card key={wh.id} className="flex items-center gap-4">
                        <button onClick={() => handleToggle(wh.id, !wh.active)} className={`w-12 h-6 rounded-full ${wh.active ? 'bg-secondary-400' : 'bg-neutral-300'}`}><div className={`w-5 h-5 bg-card rounded-full shadow transform ${wh.active ? 'translate-x-6' : 'translate-x-0.5'}`} /></button>
                        <div className="flex-1"><p className="font-semibold">{wh.name}</p><p className="text-xs text-muted-foreground font-mono">{wh.url}</p><div className="flex gap-1 mt-1">{wh.events?.map((e: string) => <Badge key={e} variant="info">{e}</Badge>)}</div></div>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(wh.id)}><Trash2 className="w-4 h-4 text-error-500" /></Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// EXPORT/IMPORT TAB
export function ExportImportTab() {
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleExport = async () => {
        const res = await fetch('/api/admin/whatsapp/export');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `whatsapp-config-${Date.now()}.json`; a.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch('/api/admin/whatsapp/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setResult(await res.json());
        setImporting(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <h3 className="font-semibold mb-4"><Download className="w-4 h-4 inline mr-2" />Exportar Configurações</h3>
                <p className="text-sm text-foreground mb-4">Exporta todas as configurações do WhatsApp: automação, templates, respostas rápidas, auto-respostas, webhooks, etiquetas e lista negra.</p>
                <Button onClick={handleExport}><Download className="w-4 h-4" />Baixar Backup</Button>
            </Card>
            <Card>
                <h3 className="font-semibold mb-4"><Upload className="w-4 h-4 inline mr-2" />Importar Configurações</h3>
                <p className="text-sm text-foreground mb-4">Restaura configurações de um arquivo de backup exportado anteriormente.</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary-hover transition-colors">
                    <Upload className="w-4 h-4" />{importing ? 'Importando...' : 'Selecionar Arquivo'}
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                {result && <div className={`mt-4 p-3 rounded-lg ${result.success ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'}`}>{result.success ? `${result.imported} configuracoes importadas` : `${result.error}`}</div>}
            </Card>
        </div>
    );
}
