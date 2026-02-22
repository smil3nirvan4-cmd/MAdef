import React from 'react';

interface StepSafetyProps {
    onNext: () => void;
    onBack: () => void;
}

export default function StepSafety({ onNext, onBack }: StepSafetyProps) {
    const items = [
        'Iluminação adequada nos corredores',
        'Ausência de tapetes soltos',
        'Barras de apoio no banheiro',
        'Acesso facilitado (rampas/elevador)',
        'Piso antiderrapante',
        'Espaço para circulação de cadeira de rodas'
    ];

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">Checklist de Segurança</h1>
            <p className="text-muted-foreground mb-8">Avaliação do ambiente domiciliar para prevenção de acidentes.</p>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <div className="grid md:grid-cols-2 gap-4">
                    {items.map((item, idx) => (
                        <label key={idx} className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-subtle text-foreground bg-card">
                            <input type="checkbox" className="w-5 h-5 text-secondary-600 rounded" />
                            <span className="font-medium text-foreground">{item}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-warning-50 text-warning-600 rounded-lg text-sm">
                    Itens nao marcados podem indicar necessidade de adequação ambiental antes do início do plantão.
                </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors"
                >
                    Finalizar Análise Ambiental →
                </button>
            </div>
        </div>
    );
}
