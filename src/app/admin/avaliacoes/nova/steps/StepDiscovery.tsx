import React from 'react';

export interface DiscoveryData {
    gatilho: string;
    gatilhoDescricao: string;
    urgencia: 'BAIXA' | 'MODERADA' | 'ALTA' | 'CRITICA';
    motivoUrgencia: string;
    situacaoAtual: string;
    sobrecargaFamiliar: number; // 1-10
    oQueTiraOSono: string;
    preocupacoes: string[];
    experienciaAnterior: string;
}

interface StepDiscoveryProps {
    data: DiscoveryData;
    onUpdate: (data: Partial<DiscoveryData>) => void;
    onNext: () => void;
    onBack: () => void;
}

// Opções Expandidas (Triplicadas)
const GATILHOS = [
    'Queda recente', 'Piora cognitiva', 'Alta hospitalar',
    'Sobrecarga familiar', 'Diagnóstico novo', 'Cuidador anterior falhou',
    'Falecimento do cônjuge', 'Burnout familiar', 'Viagem da família',
    'Fim das férias do cuidador', 'Piora na mobilidade', 'Alucinações/Delírios',
    'Agressividade', 'Incontinência súbita', 'Desnutrição/Perda de peso',
    'Erro na medicação', 'Úlcera de pressão', 'Fuga/Wanderlust',
    'Necessidade de companhia', 'Pós-Cirúrgico', 'Outro'
];

const SITUACOES = [
    'Cônjuge idoso (Vulnerável)', 'Filho(a) trabalha fora', 'Revezamento (Desgaste)',
    'Cuidador informal/vizinho', 'Sozinho dia todo (URGENTE)',
    'Sozinho à noite', 'Cuidador atual inexperiente', 'Instituição (ILPI)',
    'Rotativa de diaristas', 'Família mora longe', 'Netos cuidando',
    'Home Care (Plano) insuficiente', 'Internado (Alta breve)'
];

const PREOCUPACOES = [
    'Segurança/Quedas', 'Medicação errada', 'Alimentação/Engasgo',
    'Higiene precária', 'Solidão/Depressão', 'Sobrecarga familiar',
    'Custo financeiro', 'Confiança no estranho', 'Rotatividade',
    'Qualidade técnica', 'Vínculo afetivo', 'Privacidade da casa',
    'Agressividade do paciente', 'Sono irregular', 'Contaminações',
    'Furtos/Danos', 'Abandono de posto'
];

export default function StepDiscovery({ data, onUpdate, onNext, onBack }: StepDiscoveryProps) {
    const handleTogglePreocupacao = (item: string) => {
        const current = data.preocupacoes || [];
        if (current.includes(item)) {
            onUpdate({ preocupacoes: current.filter(i => i !== item) });
        } else {
            onUpdate({ preocupacoes: [...current, item] });
        }
    };

    const toggleGatilho = (g: string) => {
        onUpdate({ gatilho: data.gatilho === g ? '' : g });
    };

    const toggleSituacao = (s: string) => {
        onUpdate({ situacaoAtual: data.situacaoAtual === s ? '' : s });
    };

    const toggleExperiencia = (e: string) => {
        onUpdate({ experienciaAnterior: data.experienciaAnterior === e ? '' : e });
    };

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Etapa 1/9: Descoberta Detalhada</h1>
                <p className="text-muted-foreground">Mapeamento profundo do contexto familiar e gatilhos.</p>
            </div>

            {/* 1. O GATILHO */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="bg-info-100 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                    O Evento Gatilho
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                    {GATILHOS.map(g => (
                        <button
                            key={g}
                            onClick={() => toggleGatilho(g)}
                            className={`p-3 rounded-lg border text-sm text-left transition-all active:scale-[0.98] ${data.gatilho === g ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
                <textarea
                    placeholder="Descreva com detalhes o que a família relatou..."
                    className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                    rows={3}
                    value={data.gatilhoDescricao}
                    onChange={e => onUpdate({ gatilhoDescricao: e.target.value })}
                />
            </div>

            {/* 2. SITUAÇÃO ATUAL */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="bg-info-100 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                    Cenário Atual de Cuidado
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                    {SITUACOES.map(s => (
                        <button
                            key={s}
                            onClick={() => toggleSituacao(s)}
                            className={`p-3 rounded-lg border text-left text-sm transition-all active:scale-[0.98] ${data.situacaoAtual === s ? 'bg-primary-50 border-primary-500 ring-1 ring-ring text-primary shadow-sm' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 bg-background p-4 rounded-lg mt-4">
                    <label className="text-sm font-bold text-foreground flex justify-between">
                        <span>Nível de Sobrecarga / Estresse Familiar</span>
                        <span className={`font-bold ${data.sobrecargaFamiliar >= 8 ? 'text-error-600' : 'text-primary'}`}>{data.sobrecargaFamiliar}/10</span>
                    </label>
                    <input
                        type="range" min="1" max="10"
                        value={data.sobrecargaFamiliar}
                        onChange={e => onUpdate({ sobrecargaFamiliar: parseInt(e.target.value) })}
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-600 transition-all"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground font-bold px-1 mt-1">
                        <span>Leve</span>
                        <span>Moderada</span>
                        <span>Critica</span>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-bold text-foreground mb-1">O que tira o sono da família hoje?</label>
                    <textarea
                        className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                        rows={2}
                        placeholder="Ex: Medo do paciente cair de madrugada e ninguém ver..."
                        value={data.oQueTiraOSono || ''}
                        onChange={e => onUpdate({ oQueTiraOSono: e.target.value })}
                    />
                </div>
            </div>

            {/* URGÊNCIA */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="bg-info-100 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                    Sentimento de Urgência
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {['BAIXA', 'MODERADA', 'ALTA', 'CRITICA'].map(level => (
                        <button
                            key={level}
                            onClick={() => onUpdate({ urgencia: level as DiscoveryData['urgencia'] })}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all active:scale-[0.98] ${data.urgencia === level ? (level === 'CRITICA' || level === 'ALTA' ? 'bg-error-500 text-white border-error-600 shadow-sm' : 'bg-primary text-primary-foreground border-primary shadow-sm') : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-bold text-foreground mb-1">Motivo da Urgência</label>
                    <textarea
                        className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                        rows={2}
                        placeholder="Por que precisam para agora? Ex: Alta amanhã do hospital..."
                        value={data.motivoUrgencia || ''}
                        onChange={e => onUpdate({ motivoUrgencia: e.target.value })}
                    />
                </div>
            </div>

            {/* PREOCUPAÇÕES */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="bg-info-100 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                    Medos e Objeções (Multiseleção)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PREOCUPACOES.map(p => (
                        <button
                            key={p}
                            onClick={() => handleTogglePreocupacao(p)}
                            className={`px-3 py-2 rounded-lg border text-sm text-left transition-all active:scale-[0.98] flex items-center gap-2 ${data.preocupacoes?.includes(p) ? 'bg-error-50 text-error-700 border-error-500 ring-1 ring-error-500 font-bold shadow-sm' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border ${data.preocupacoes?.includes(p) ? 'bg-error-500 border-error-500' : 'border-border-hover'}`} />
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. EXPERIÊNCIAS */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="bg-info-100 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                    Histórico com Cuidadores
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        'Nunca tiveram', 'Positiva (Mesma empresa)', 'Positiva (Outra empresa)',
                        'Positiva (Informal)', 'Negativa (Técnica)', 'Negativa (Comportamental)',
                        'Negativa (Faltas)', 'Negativa (Roubo)', 'Neutra'
                    ].map(e => (
                        <button
                            key={e}
                            onClick={() => toggleExperiencia(e)}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all active:scale-[0.98] ${data.experienciaAnterior === e ? 'bg-neutral-800 text-white border-neutral-800 shadow-sm' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            {e}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground font-medium">← Voltar para Início</button>
                <button
                    onClick={onNext}
                    disabled={!data.gatilho}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-primary-hover hover:scale-105 transition transform disabled:opacity-50 disabled:scale-100"
                >
                    Próxima: Dados Pessoais →
                </button>
            </div>
        </div>
    );
}
