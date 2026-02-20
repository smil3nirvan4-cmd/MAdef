'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Plus, Trash2, Save, X, ChevronDown, ChevronRight, Edit2,
    MessageCircle, HelpCircle, Image, Video, Mic, FileText,
    GitBranch, Zap, Clock, GripVertical, ArrowDown, Copy
} from 'lucide-react';

import { MousePointer, List } from 'lucide-react';

interface FlowStep {
    id: string;
    type: 'message' | 'question' | 'media' | 'condition' | 'action' | 'delay' | 'buttons' | 'list';
    content: string;
    mediaType?: string;
    mediaUrl?: string;
    variable?: string;
    options?: { value: string; nextStep: string; }[];
    condition?: { variable: string; operator: string; value: string; trueStep: string; falseStep: string; };
    action?: { type: string; params: any; };
    nextStep?: string;
    delay?: number;
    buttons?: { id: string; text: string; nextStep?: string; }[];
    footer?: string;
    listButtonText?: string;
    sections?: { title: string; rows: { id: string; title: string; description?: string; nextStep?: string; }[] }[];
}

interface FlowDefinition {
    id: string;
    name: string;
    description: string;
    trigger: string;
    category: string;
    active: boolean;
    steps: FlowStep[];
}

const STEP_ICONS: Record<string, any> = {
    message: MessageCircle, question: HelpCircle, media: Image, condition: GitBranch, action: Zap, delay: Clock, buttons: MousePointer, list: List,
};

const STEP_COLORS: Record<string, string> = {
    message: 'bg-info-100 border-blue-300', question: 'bg-success-100 border-secondary-400/40', media: 'bg-accent-500/15 border-accent-500/40',
    condition: 'bg-warning-100 border-yellow-300', action: 'bg-error-100 border-error-500/40', delay: 'bg-surface-subtle border-border-hover',
    buttons: 'bg-cyan-100 border-cyan-300', list: 'bg-accent-500/15 border-orange-300',
};

export function FlowBuilderTab() {
    const [flows, setFlows] = useState<FlowDefinition[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [stepTypes, setStepTypes] = useState<string[]>([]);
    const [mediaTypes, setMediaTypes] = useState<string[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
    const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
    const [showNewFlow, setShowNewFlow] = useState(false);
    const [newFlow, setNewFlow] = useState({ name: '', description: '', trigger: '', category: 'custom' });
    const [saving, setSaving] = useState(false);

    const fetchFlows = async () => {
        const res = await fetch('/api/admin/whatsapp/flow-definitions');
        if (res.ok) {
            const data = await res.json();
            setFlows(data.flows || []);
            setCategories(data.categories || []);
            setStepTypes(data.stepTypes || []);
            setMediaTypes(data.mediaTypes || []);
            setActionTypes(data.actionTypes || []);
        }
    };

    useEffect(() => { fetchFlows(); }, []);

    const handleSelectFlow = async (id: string) => {
        const res = await fetch(`/api/admin/whatsapp/flow-definitions?id=${id}`);
        if (res.ok) { const data = await res.json(); setSelectedFlow(data.flow); }
    };

    const handleToggleActive = async (id: string, active: boolean) => {
        await fetch('/api/admin/whatsapp/flow-definitions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active }) });
        fetchFlows();
    };

    const handleCreateFlow = async () => {
        await fetch('/api/admin/whatsapp/flow-definitions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFlow) });
        setNewFlow({ name: '', description: '', trigger: '', category: 'custom' }); setShowNewFlow(false); fetchFlows();
    };

    const handleDeleteFlow = async (id: string) => {
        if (confirm('Excluir este fluxo?')) {
            await fetch(`/api/admin/whatsapp/flow-definitions?id=${id}`, { method: 'DELETE' });
            if (selectedFlow?.id === id) setSelectedFlow(null);
            fetchFlows();
        }
    };

    const handleSaveFlow = async () => {
        if (!selectedFlow) return;
        setSaving(true);
        await fetch('/api/admin/whatsapp/flow-definitions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedFlow) });
        setSaving(false); fetchFlows();
    };

    const addStep = (type: string) => {
        if (!selectedFlow) return;
        const newStep: FlowStep = { id: `step_${Date.now()}`, type: type as any, content: '', nextStep: '' };
        setSelectedFlow({ ...selectedFlow, steps: [...selectedFlow.steps, newStep] });
    };

    const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
        if (!selectedFlow) return;
        setSelectedFlow({ ...selectedFlow, steps: selectedFlow.steps.map(s => s.id === stepId ? { ...s, ...updates } : s) });
    };

    const deleteStep = (stepId: string) => {
        if (!selectedFlow) return;
        setSelectedFlow({ ...selectedFlow, steps: selectedFlow.steps.filter(s => s.id !== stepId) });
    };

    const duplicateStep = (step: FlowStep) => {
        if (!selectedFlow) return;
        const newStep = { ...step, id: `step_${Date.now()}` };
        setSelectedFlow({ ...selectedFlow, steps: [...selectedFlow.steps, newStep] });
    };

    const moveStep = (idx: number, direction: 'up' | 'down') => {
        if (!selectedFlow) return;
        const steps = [...selectedFlow.steps];
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= steps.length) return;
        [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
        setSelectedFlow({ ...selectedFlow, steps });
    };

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Flows List */}
            <Card className="!p-0">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold">Fluxos</h3>
                    <Button size="sm" onClick={() => setShowNewFlow(true)}><Plus className="w-4 h-4" /></Button>
                </div>

                {showNewFlow && (
                    <div className="p-4 border-b bg-info-50">
                        <Input placeholder="Nome do fluxo" value={newFlow.name} onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })} className="mb-2" />
                        <Input placeholder="Trigger (palavras|separadas|por|pipe)" value={newFlow.trigger} onChange={(e) => setNewFlow({ ...newFlow, trigger: e.target.value })} className="mb-2" />
                        <select value={newFlow.category} onChange={(e) => setNewFlow({ ...newFlow, category: e.target.value })} className="w-full border rounded px-2 py-1 mb-2 text-sm">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="custom">custom</option>
                        </select>
                        <div className="flex gap-2"><Button size="sm" onClick={handleCreateFlow}>Criar</Button><Button size="sm" variant="outline" onClick={() => setShowNewFlow(false)}>Cancelar</Button></div>
                    </div>
                )}

                <div className="overflow-y-auto max-h-[60vh]">
                    {categories.map(cat => (
                        <div key={cat}>
                            <div className="px-4 py-2 bg-background text-xs font-semibold uppercase text-muted-foreground">{cat}</div>
                            {flows.filter(f => f.category === cat).map(flow => (
                                <button key={flow.id} onClick={() => handleSelectFlow(flow.id)}
                                    className={`w-full p-3 text-left border-b hover:bg-background flex items-center gap-3 ${selectedFlow?.id === flow.id ? 'bg-primary-50' : ''}`}>
                                    <div className={`w-3 h-3 rounded-full ${flow.active ? 'bg-secondary-400' : 'bg-neutral-300'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{flow.name}</p>
                                        <p className="text-xs text-muted-foreground">{flow.steps?.length || 0} etapas</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Flow Editor */}
            {selectedFlow ? (
                <Card className="lg:col-span-2 !p-0">
                    {/* Flow Header */}
                    <div className="p-4 border-b flex justify-between items-start">
                        <div className="flex-1">
                            <Input value={selectedFlow.name} onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })} className="font-semibold text-lg mb-2" />
                            <Input placeholder="Descrição" value={selectedFlow.description} onChange={(e) => setSelectedFlow({ ...selectedFlow, description: e.target.value })} className="text-sm mb-2" />
                            <Input placeholder="Trigger (palavras|pipe)" value={selectedFlow.trigger} onChange={(e) => setSelectedFlow({ ...selectedFlow, trigger: e.target.value })} className="text-sm font-mono" />
                        </div>
                        <div className="flex gap-2 ml-4">
                            <Button size="sm" variant={selectedFlow.active ? 'primary' : 'outline'} onClick={() => { setSelectedFlow({ ...selectedFlow, active: !selectedFlow.active }); }}>
                                {selectedFlow.active ? 'Ativo' : 'Inativo'}
                            </Button>
                            <Button size="sm" onClick={handleSaveFlow} isLoading={saving}><Save className="w-4 h-4" /></Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteFlow(selectedFlow.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                    </div>

                    {/* Add Step Buttons */}
                    <div className="p-4 border-b flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground mr-2">Adicionar:</span>
                        {stepTypes.map(type => {
                            const Icon = STEP_ICONS[type] || MessageCircle;
                            return <Button key={type} size="sm" variant="outline" onClick={() => addStep(type)}><Icon className="w-4 h-4" />{type}</Button>;
                        })}
                    </div>

                    {/* Steps */}
                    <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
                        {selectedFlow.steps.map((step, idx) => (
                            <StepEditor
                                key={step.id}
                                step={step}
                                index={idx}
                                totalSteps={selectedFlow.steps.length}
                                allSteps={selectedFlow.steps}
                                mediaTypes={mediaTypes}
                                actionTypes={actionTypes}
                                onUpdate={(updates) => updateStep(step.id, updates)}
                                onDelete={() => deleteStep(step.id)}
                                onDuplicate={() => duplicateStep(step)}
                                onMove={(dir) => moveStep(idx, dir)}
                            />
                        ))}
                        {selectedFlow.steps.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">Adicione etapas usando os botões acima</p>
                        )}
                    </div>
                </Card>
            ) : (
                <Card className="lg:col-span-2 flex items-center justify-center text-muted-foreground">
                    Selecione um fluxo para editar
                </Card>
            )}
        </div>
    );
}

function StepEditor({ step, index, totalSteps, allSteps, mediaTypes, actionTypes, onUpdate, onDelete, onDuplicate, onMove }: {
    step: FlowStep; index: number; totalSteps: number; allSteps: FlowStep[];
    mediaTypes: string[]; actionTypes: string[];
    onUpdate: (updates: Partial<FlowStep>) => void;
    onDelete: () => void; onDuplicate: () => void;
    onMove: (dir: 'up' | 'down') => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const Icon = STEP_ICONS[step.type] || MessageCircle;

    return (
        <div className={`border-2 rounded-lg ${STEP_COLORS[step.type] || 'bg-background border-border'}`}>
            <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <Icon className="w-5 h-5" />
                <span className="font-medium flex-1">{step.id}</span>
                <Badge>{step.type}</Badge>
                <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onMove('up'); }} disabled={index === 0} className="p-1 hover:bg-card rounded disabled:opacity-30">↑</button>
                    <button onClick={(e) => { e.stopPropagation(); onMove('down'); }} disabled={index === totalSteps - 1} className="p-1 hover:bg-card rounded disabled:opacity-30">↓</button>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-card rounded"><Copy className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-error-50 rounded"><Trash2 className="w-4 h-4 text-error-500" /></button>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {expanded && (
                <div className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="ID da Etapa" value={step.id} onChange={(e) => onUpdate({ id: e.target.value })} />
                        <div>
                            <label className="text-xs text-foreground">Próxima Etapa</label>
                            <select value={step.nextStep || ''} onChange={(e) => onUpdate({ nextStep: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">
                                <option value="">Fim do fluxo</option>
                                {allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="text-xs text-foreground">Conteúdo da Mensagem</label>
                        <textarea className="w-full border rounded p-2 text-sm h-24 mt-1" value={step.content} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Use {{variavel}} para dados dinâmicos" />
                    </div>

                    {/* Type-specific fields */}
                    {step.type === 'question' && (
                        <div>
                            <Input label="Salvar resposta em (variável)" value={step.variable || ''} onChange={(e) => onUpdate({ variable: e.target.value })} placeholder="nome_variavel" />
                            <div className="mt-2">
                                <label className="text-xs text-foreground">Opções de Resposta (opcional)</label>
                                {step.options?.map((opt, i) => (
                                    <div key={i} className="flex gap-2 mt-1">
                                        <Input placeholder="Valor" value={opt.value} onChange={(e) => { const opts = [...(step.options || [])]; opts[i].value = e.target.value; onUpdate({ options: opts }); }} className="flex-1" />
                                        <select value={opt.nextStep} onChange={(e) => { const opts = [...(step.options || [])]; opts[i].nextStep = e.target.value; onUpdate({ options: opts }); }} className="border rounded px-2 text-sm">
                                            <option value="">Próx. padrão</option>{allSteps.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                                        </select>
                                        <button onClick={() => { onUpdate({ options: step.options?.filter((_, j) => j !== i) }); }} className="text-error-500">×</button>
                                    </div>
                                ))}
                                <Button size="sm" variant="outline" className="mt-2" onClick={() => onUpdate({ options: [...(step.options || []), { value: '', nextStep: '' }] })}><Plus className="w-3 h-3" />Opção</Button>
                            </div>
                        </div>
                    )}

                    {step.type === 'media' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-foreground">Tipo de Mídia</label>
                                <select value={step.mediaType || 'image'} onChange={(e) => onUpdate({ mediaType: e.target.value })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">
                                    {mediaTypes.map(mt => <option key={mt} value={mt}>{mt === 'image' ? 'Imagem' : mt === 'video' ? 'Video' : mt === 'audio' ? 'Audio' : 'Documento'}</option>)}
                                </select>
                            </div>
                            <Input label="URL da Mídia" value={step.mediaUrl || ''} onChange={(e) => onUpdate({ mediaUrl: e.target.value })} placeholder="https://..." />
                        </div>
                    )}

                    {step.type === 'delay' && (
                        <Input label="Delay (segundos)" type="number" value={step.delay || 0} onChange={(e) => onUpdate({ delay: parseInt(e.target.value) })} />
                    )}

                    {step.type === 'action' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-foreground">Tipo de Ação</label>
                                <select value={step.action?.type || ''} onChange={(e) => onUpdate({ action: { ...step.action, type: e.target.value, params: step.action?.params || {} } })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">
                                    <option value="">Selecione...</option>
                                    {actionTypes.map(at => <option key={at} value={at}>{at}</option>)}
                                </select>
                            </div>
                            <Input label="Parâmetros (JSON)" value={JSON.stringify(step.action?.params || {})} onChange={(e) => { try { onUpdate({ action: { ...step.action, type: step.action?.type || '', params: JSON.parse(e.target.value) } }); } catch { } }} />
                        </div>
                    )}

                    {step.type === 'condition' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <Input label="Variável" value={step.condition?.variable || ''} onChange={(e) => onUpdate({ condition: { ...step.condition!, variable: e.target.value } })} />
                                <div>
                                    <label className="text-xs text-foreground">Operador</label>
                                    <select value={step.condition?.operator || '=='} onChange={(e) => onUpdate({ condition: { ...step.condition!, operator: e.target.value } })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">
                                        <option value="==">Igual</option><option value="!=">Diferente</option><option value="contains">Contém</option><option value=">">Maior</option><option value="<">Menor</option>
                                    </select>
                                </div>
                                <Input label="Valor" value={step.condition?.value || ''} onChange={(e) => onUpdate({ condition: { ...step.condition!, value: e.target.value } })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs text-foreground">Se TRUE → Etapa</label><select value={step.condition?.trueStep || ''} onChange={(e) => onUpdate({ condition: { ...step.condition!, trueStep: e.target.value } })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">{allSteps.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></div>
                                <div><label className="text-xs text-foreground">Se FALSE → Etapa</label><select value={step.condition?.falseStep || ''} onChange={(e) => onUpdate({ condition: { ...step.condition!, falseStep: e.target.value } })} className="w-full border rounded px-2 py-1.5 mt-1 text-sm">{allSteps.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></div>
                            </div>
                        </div>
                    )}

                    {/* BOTÕES INTERATIVOS */}
                    {step.type === 'buttons' && (
                        <div className="space-y-3">
                            <div className="p-3 bg-cyan-50 rounded-lg">
                                <p className="text-xs text-cyan-700 mb-1">Maximo de 3 botoes clicáveis. Os botões aparecerão na tela do usuário para ele tocar.</p>
                            </div>
                            <Input label="Salvar resposta em (variável)" value={step.variable || ''} onChange={(e) => onUpdate({ variable: e.target.value })} placeholder="resposta" />
                            <Input label="Rodapé (opcional)" value={step.footer || ''} onChange={(e) => onUpdate({ footer: e.target.value })} placeholder="Selecione uma opção" />
                            <div>
                                <label className="text-xs text-foreground">Botões (máx 3)</label>
                                {step.buttons?.map((btn, i) => (
                                    <div key={i} className="flex gap-2 mt-2 items-center">
                                        <Input placeholder="ID" value={btn.id} onChange={(e) => { const btns = [...(step.buttons || [])]; btns[i].id = e.target.value; onUpdate({ buttons: btns }); }} className="w-24" />
                                        <Input placeholder="Texto do Botão" value={btn.text} onChange={(e) => { const btns = [...(step.buttons || [])]; btns[i].text = e.target.value; onUpdate({ buttons: btns }); }} className="flex-1" />
                                        <select value={btn.nextStep || ''} onChange={(e) => { const btns = [...(step.buttons || [])]; btns[i].nextStep = e.target.value; onUpdate({ buttons: btns }); }} className="border rounded px-2 py-1 text-sm">
                                            <option value="">Próx. padrão</option>{allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                                        </select>
                                        <button onClick={() => { onUpdate({ buttons: step.buttons?.filter((_, j) => j !== i) }); }} className="text-error-500 text-xl">×</button>
                                    </div>
                                ))}
                                {(!step.buttons || step.buttons.length < 3) && (
                                    <Button size="sm" variant="outline" className="mt-2" onClick={() => onUpdate({ buttons: [...(step.buttons || []), { id: `btn_${Date.now()}`, text: '', nextStep: '' }] })}><Plus className="w-3 h-3" />Botão</Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LISTA INTERATIVA */}
                    {step.type === 'list' && (
                        <div className="space-y-3">
                            <div className="p-3 bg-accent-500/10 rounded-lg">
                                <p className="text-xs text-accent-700 mb-1">Lista com secoes e itens. O usuário toca em "Ver opções" e escolhe um item.</p>
                            </div>
                            <Input label="Salvar resposta em (variável)" value={step.variable || ''} onChange={(e) => onUpdate({ variable: e.target.value })} placeholder="escolha" />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Texto do Botão" value={step.listButtonText || 'Ver opções'} onChange={(e) => onUpdate({ listButtonText: e.target.value })} />
                                <Input label="Rodapé (opcional)" value={step.footer || ''} onChange={(e) => onUpdate({ footer: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-foreground font-semibold">Seções e Itens</label>
                                {step.sections?.map((sec, si) => (
                                    <div key={si} className="mt-3 p-3 border rounded-lg bg-card">
                                        <div className="flex gap-2 items-center mb-2">
                                            <Input placeholder="Título da Seção" value={sec.title} onChange={(e) => { const secs = [...(step.sections || [])]; secs[si].title = e.target.value; onUpdate({ sections: secs }); }} className="flex-1" />
                                            <button onClick={() => { onUpdate({ sections: step.sections?.filter((_, j) => j !== si) }); }} className="text-error-500"></button>
                                        </div>
                                        {sec.rows?.map((row, ri) => (
                                            <div key={ri} className="flex gap-2 mt-1 items-center ml-4">
                                                <Input placeholder="ID" value={row.id} onChange={(e) => { const secs = [...(step.sections || [])]; secs[si].rows[ri].id = e.target.value; onUpdate({ sections: secs }); }} className="w-20" />
                                                <Input placeholder="Título" value={row.title} onChange={(e) => { const secs = [...(step.sections || [])]; secs[si].rows[ri].title = e.target.value; onUpdate({ sections: secs }); }} className="flex-1" />
                                                <Input placeholder="Descrição" value={row.description || ''} onChange={(e) => { const secs = [...(step.sections || [])]; secs[si].rows[ri].description = e.target.value; onUpdate({ sections: secs }); }} className="flex-1" />
                                                <select value={row.nextStep || ''} onChange={(e) => { const secs = [...(step.sections || [])]; secs[si].rows[ri].nextStep = e.target.value; onUpdate({ sections: secs }); }} className="border rounded px-2 py-1 text-xs">
                                                    <option value="">Próx.</option>{allSteps.filter(s => s.id !== step.id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                                                </select>
                                                <button onClick={() => { const secs = [...(step.sections || [])]; secs[si].rows = secs[si].rows.filter((_, j) => j !== ri); onUpdate({ sections: secs }); }} className="text-error-500">×</button>
                                            </div>
                                        ))}
                                        <Button size="sm" variant="ghost" className="mt-2 ml-4" onClick={() => { const secs = [...(step.sections || [])]; secs[si].rows.push({ id: `item_${Date.now()}`, title: '', description: '' }); onUpdate({ sections: secs }); }}><Plus className="w-3 h-3" />Item</Button>
                                    </div>
                                ))}
                                <Button size="sm" variant="outline" className="mt-2" onClick={() => onUpdate({ sections: [...(step.sections || []), { title: 'Nova Seção', rows: [] }] })}><Plus className="w-3 h-3" />Seção</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
