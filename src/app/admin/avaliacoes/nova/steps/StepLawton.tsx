import React from 'react';
import { LawtonEvaluation } from '@/types/evaluation';

interface StepLawtonProps {
    data: LawtonEvaluation;
    onUpdate: (field: keyof LawtonEvaluation, value: 1 | 2 | 3) => void;
    onNext: () => void;
    onBack: () => void;
}

const items = [
    { key: 'telefone', label: 'Uso do Telefone', q1: 'Usa sem ajuda', q2: 'Usa com ajuda parcial', q3: 'Não usa' },
    { key: 'compras', label: 'Fazer Compras', q1: 'Faz todas as compras', q2: 'Faz pequenas compras', q3: 'Não faz compras' },
    { key: 'cozinhar', label: 'Preparar Refeições', q1: 'Planeja e cozinha', q2: 'Prepara se ingredientes prontos', q3: 'Não cozinha' },
    { key: 'tarefasDomesticas', label: 'Tarefas Domésticas', q1: 'Cuida da casa sozinho', q2: 'Tarefas leves', q3: 'Não participa' },
    { key: 'lavanderia', label: 'Lavanderia', q1: 'Lava tudo', q2: 'Lava pequenas peças', q3: 'Não lava' },
    { key: 'transporte', label: 'Meios de Transporte', q1: 'Viaja sozinho', q2: 'Viaja acompanhado', q3: 'Não viaja' },
    { key: 'medicacao', label: 'Responsabilidade com Medicação', q1: 'Toma na hora certa', q2: 'Toma se preparados', q3: 'Não toma sozinho' },
    { key: 'financas', label: 'Capacidade Financeira', q1: 'Gerencia financas', q2: 'Pequenas despesas', q3: 'Incapaz' },
];

export default function StepLawton({ data, onUpdate, onNext, onBack }: StepLawtonProps) {
    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Escala de Lawton</h1>
            <p className="text-gray-500 mb-8">Avalie a capacidade para Atividades Instrumentais de Vida Diária (AIVD).</p>

            <div className="space-y-6">
                {items.map(({ key, label, q1, q2, q3 }) => {
                    const currentVal = data[key as keyof LawtonEvaluation];
                    return (
                        <div key={key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">{label}</h3>
                            <div className="grid md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => onUpdate(key as keyof LawtonEvaluation, 3)}
                                    className={`p-4 rounded-lg border text-left transition-all ${currentVal === 3
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-bold text-blue-900 mb-1">3 pts</div>
                                    <div className="text-sm text-gray-600">{q1} (Independente)</div>
                                </button>

                                <button
                                    onClick={() => onUpdate(key as keyof LawtonEvaluation, 2)}
                                    className={`p-4 rounded-lg border text-left transition-all ${currentVal === 2
                                            ? 'bg-yellow-50 border-yellow-500 ring-1 ring-yellow-500'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-bold text-yellow-900 mb-1">2 pts</div>
                                    <div className="text-sm text-gray-600">{q2} (Parcial)</div>
                                </button>

                                <button
                                    onClick={() => onUpdate(key as keyof LawtonEvaluation, 1)}
                                    className={`p-4 rounded-lg border text-left transition-all ${currentVal === 1
                                            ? 'bg-red-50 border-red-500 ring-1 ring-red-500'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="font-bold text-red-900 mb-1">1 pt</div>
                                    <div className="text-sm text-gray-600">{q3} (Dependente)</div>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t pb-20">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700"
                >
                    Finalizar Avaliação Clínica →
                </button>
            </div>
        </div>
    );
}
