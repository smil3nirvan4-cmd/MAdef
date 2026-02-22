import React from 'react';
import { KATZEvaluation } from '@/types/evaluation';

interface StepKatzProps {
    data: KATZEvaluation;
    onUpdate: (field: keyof KATZEvaluation, value: 'independente' | 'parcial' | 'dependente') => void;
    onNext: () => void;
    onBack: () => void;
}

const activities = [
    { key: 'banho', label: 'Banho', desc: 'Capacidade de se lavar sozinho(a)' },
    { key: 'vestir', label: 'Vestir-se', desc: 'Pegar roupas e vestir-se sem ajuda' },
    { key: 'higiene', label: 'Higiene Pessoal', desc: 'Ir ao banheiro, se limpar e arrumar roupas' },
    { key: 'transferencia', label: 'Transferência', desc: 'Mover-se da cama para cadeira e vice-versa' },
    { key: 'continencia', label: 'Continência', desc: 'Controle completo de funções fisiológicas' },
    { key: 'alimentacao', label: 'Alimentação', desc: 'Levar comida à boca sem ajuda' },
];

export default function StepKatz({ data, onUpdate, onNext, onBack }: StepKatzProps) {
    return (
        <div className="max-w-5xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">Escala de Katz</h1>
            <p className="text-muted-foreground mb-8">Avalie a independência do paciente nas Atividades de Vida Diária (AVDs).</p>

            <div className="grid lg:grid-cols-2 gap-6">
                {activities.map(({ key, label, desc }) => (
                    <div key={key} className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-foreground">{label}</h3>
                            <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>

                        <div className="flex gap-2 text-sm">
                            <button
                                onClick={() => onUpdate(key as keyof KATZEvaluation, 'independente')}
                                className={`flex-1 py-2 px-2 rounded-lg border font-medium transition-all active:scale-[0.98] ${data[key as keyof KATZEvaluation] === 'independente'
                                    ? 'bg-success-50 border-secondary-500 text-secondary-700 shadow-sm ring-1 ring-secondary-500'
                                    : 'border-border bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground'
                                    }`}
                            >
                                ✨ S (Sempre independente)
                            </button>
                            <button
                                onClick={() => onUpdate(key as keyof KATZEvaluation, 'parcial')}
                                className={`flex-1 py-2 px-2 rounded-lg border font-medium transition-all active:scale-[0.98] ${data[key as keyof KATZEvaluation] === 'parcial'
                                    ? 'bg-warning-50 border-warning-500 text-warning-700 shadow-sm ring-1 ring-warning-500'
                                    : 'border-border bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground'
                                    }`}
                            >
                                AV (Às vezes precisa de ajuda)
                            </button>
                            <button
                                onClick={() => onUpdate(key as keyof KATZEvaluation, 'dependente')}
                                className={`flex-1 py-2 px-2 rounded-lg border font-medium transition-all active:scale-[0.98] ${data[key as keyof KATZEvaluation] === 'dependente'
                                    ? 'bg-error-50 border-error-500 text-error-700 shadow-sm ring-1 ring-error-500'
                                    : 'border-border bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground'
                                    }`}
                            >
                                🆘 Sempre (Dependente total)
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors"
                >
                    Próxima Etapa: Lawton →
                </button>
            </div>
        </div>
    );
}
