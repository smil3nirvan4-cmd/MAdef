import React from 'react';
import { KATZEvaluation } from '@/types/evaluation';

interface StepKatzProps {
    data: KATZEvaluation;
    onUpdate: (field: keyof KATZEvaluation, value: 'independente' | 'dependente') => void;
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
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Escala de Katz</h1>
            <p className="text-gray-500 mb-8">Avalie a independência do paciente nas Atividades de Vida Diária (AVDs).</p>

            <div className="grid md:grid-cols-2 gap-6">
                {activities.map(({ key, label, desc }) => (
                    <div key={key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-800">{label}</h3>
                            <p className="text-sm text-gray-500">{desc}</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => onUpdate(key as keyof KATZEvaluation, 'independente')}
                                className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all ${data[key as keyof KATZEvaluation] === 'independente'
                                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                ✨ Independente
                            </button>
                            <button
                                onClick={() => onUpdate(key as keyof KATZEvaluation, 'dependente')}
                                className={`flex-1 py-3 px-4 rounded-lg border font-medium transition-all ${data[key as keyof KATZEvaluation] === 'dependente'
                                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                🆘 Dependente
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700"
                >
                    Próxima Etapa: Lawton →
                </button>
            </div>
        </div>
    );
}
