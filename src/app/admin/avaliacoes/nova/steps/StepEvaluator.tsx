import React from 'react';

export interface EvaluatorData {
    resumoVaga: string;
    restricoesAbsolutas: string;
    perfilIdeal: string;
    complexidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    setupAmbiente: string;
}

interface StepEvaluatorProps {
    data: EvaluatorData;
    onUpdate: (data: Partial<EvaluatorData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepEvaluator({ data, onUpdate, onNext, onBack }: StepEvaluatorProps) {
    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Etapa 8/9: Avaliador Geral e Setup</h1>
                <p className="text-muted-foreground">Informações cruciais para a seleção do perfil pela equipe de RH.</p>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <div>
                    <label className="block text-sm font-bold text-foreground mb-1">Resumo para Seleção (Human Heading)</label>
                    <textarea
                        className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                        rows={3}
                        placeholder="Ex: Idoso de 80 anos, lúcido mas com mobilidade reduzida. Precisa de cuidador forte..."
                        value={data.resumoVaga || ''}
                        onChange={e => onUpdate({ resumoVaga: e.target.value })}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-error-600 mb-1">Restricoes Absolutas</label>
                        <textarea
                            className="w-full border border-error-300 p-3 rounded-lg text-sm bg-error-50 focus:bg-card focus:ring-2 focus:ring-error-200 focus:border-error-500 outline-none transition-all placeholder:text-error-300 text-error-800"
                            rows={3}
                            placeholder="Ex: NÃO PODE ser fumante. NÃO PODE ter alergia a gatos..."
                            value={data.restricoesAbsolutas || ''}
                            onChange={e => onUpdate({ restricoesAbsolutas: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-success-600 mb-1">Perfil Ideal do Cuidador ✨</label>
                        <textarea
                            className="w-full border border-success-300 p-3 rounded-lg text-sm bg-success-50 focus:bg-card focus:ring-2 focus:ring-success-200 focus:border-success-500 outline-none transition-all placeholder:text-success-400 text-success-800"
                            rows={3}
                            placeholder="Ex: Pessoa calma, evangélica (preferência da família), com experiência em Alzheimer..."
                            value={data.perfilIdeal || ''}
                            onChange={e => onUpdate({ perfilIdeal: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Complexidade da Vaga</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(level => (
                            <button
                                key={level}
                                onClick={() => onUpdate({ complexidade: level as EvaluatorData['complexidade'] })}
                                className={`p-3 rounded-lg border text-sm font-bold transition-all active:scale-[0.98] ${data.complexidade === level ? (level === 'CRITICA' || level === 'ALTA' ? 'bg-error-500 text-white border-error-600 shadow-sm' : 'bg-primary text-primary-foreground border-primary shadow-sm') : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground mb-1">Setup do Ambiente para o Cuidador</label>
                    <textarea
                        className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                        rows={3}
                        placeholder="Ex: Cuidador ficará no quarto de hóspedes. Pode usar wifi. Alimentação por conta da família..."
                        value={data.setupAmbiente || ''}
                        onChange={e => onUpdate({ setupAmbiente: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground font-medium">← Voltar</button>
                <button onClick={onNext} className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors">Ir para Proposta &rarr;</button>
            </div>
        </div>
    );
}
