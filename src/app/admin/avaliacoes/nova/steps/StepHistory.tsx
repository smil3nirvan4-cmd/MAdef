import React from 'react';

interface StepHistoryProps {
    onNext: () => void;
    onBack: () => void;
}

export default function StepHistory({ onNext, onBack }: StepHistoryProps) {
    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">Histórico de Saúde</h1>
            <p className="text-muted-foreground mb-8">Registre as condições clínicas e histórico médico do paciente.</p>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Diagnóstico Principal</label>
                    <textarea
                        className="w-full border p-3 rounded-lg"
                        rows={3}
                        placeholder="Ex: Alzheimer estágio moderado, Hipertensão..."
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Alergias</label>
                        <input className="w-full border p-3 rounded-lg" placeholder="Nenhuma conhecida" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Medicamentos em Uso</label>
                        <input className="w-full border p-3 rounded-lg" placeholder="Listar principais..." />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Comorbidades</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Diabetes', 'Hipertensão', 'Cardiopatia', 'AVC Prévio', 'Demência'].map(c => (
                            <label key={c} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-background">
                                <input type="checkbox" />
                                <span>{c}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-primary"
                >
                    Próxima Etapa: ABEMID →
                </button>
            </div>
        </div>
    );
}
