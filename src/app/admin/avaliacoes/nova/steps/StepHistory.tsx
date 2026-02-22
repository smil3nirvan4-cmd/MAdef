import React from 'react';

interface StepHistoryProps {
    onNext: () => void;
    onBack: () => void;
}

const inputBase = 'w-full border border-border-hover p-3 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all';

export default function StepHistory({ onNext, onBack }: StepHistoryProps) {
    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">Histórico de Saúde</h1>
            <p className="text-muted-foreground mb-8">Registre as condições clínicas e histórico médico do paciente.</p>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Diagnóstico Principal</label>
                    <textarea
                        className={inputBase}
                        rows={3}
                        placeholder="Ex: Alzheimer estágio moderado, Hipertensão..."
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Alergias</label>
                        <input className={inputBase} placeholder="Nenhuma conhecida" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Medicamentos em Uso</label>
                        <input className={inputBase} placeholder="Listar principais..." />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Comorbidades</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Diabetes', 'Hipertensão', 'Cardiopatia', 'AVC Prévio', 'Demência'].map(c => (
                            <label key={c} className="flex items-center gap-2 border border-border bg-card p-2 rounded-lg cursor-pointer hover:bg-surface-subtle text-foreground transition-colors">
                                <input type="checkbox" className="w-4 h-4 accent-primary-600" />
                                <span className="text-sm">{c}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">&larr; Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors"
                >
                    Próxima Etapa: ABEMID &rarr;
                </button>
            </div>
        </div>
    );
}
