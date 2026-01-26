import React from 'react';

export interface DiscoveryData {
    gatilho: string;
    gatilhoDescricao: string;
    urgencia: 'BAIXA' | 'MODERADA' | 'ALTA' | 'CRITICA';
    situacaoAtual: string;
    sobrecargaFamiliar: number; // 1-10
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
                <h1 className="text-3xl font-bold text-gray-900">Etapa 1/9: Descoberta Detalhada</h1>
                <p className="text-gray-500">Mapeamento profundo do contexto familiar e gatilhos.</p>
            </div>

            {/* 1. O GATILHO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                    O Evento Gatilho
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                    {GATILHOS.map(g => (
                        <button
                            key={g}
                            onClick={() => toggleGatilho(g)}
                            className={`p-3 rounded-lg border text-xs text-left transition ${data.gatilho === g ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
                <textarea
                    placeholder="Descreva com detalhes o que a família relatou..."
                    className="w-full border p-3 rounded-lg text-sm bg-gray-50 focus:bg-white transition"
                    rows={3}
                    value={data.gatilhoDescricao}
                    onChange={e => onUpdate({ gatilhoDescricao: e.target.value })}
                />
            </div>

            {/* 2. SITUAÇÃO ATUAL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                    Cenário Atual de Cuidado
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                    {SITUACOES.map(s => (
                        <button
                            key={s}
                            onClick={() => toggleSituacao(s)}
                            className={`p-3 rounded-lg border text-left text-xs transition ${data.situacaoAtual === s ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'hover:bg-gray-50'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-bold text-gray-700 flex justify-between">
                        <span>Nível de Sobrecarga / Estresse Familiar</span>
                        <span className={`font-bold ${data.sobrecargaFamiliar >= 8 ? 'text-red-600' : 'text-blue-600'}`}>{data.sobrecargaFamiliar}/10</span>
                    </label>
                    <input
                        type="range" min="1" max="10"
                        value={data.sobrecargaFamiliar}
                        onChange={e => onUpdate({ sobrecargaFamiliar: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 font-bold px-1">
                        <span>😌 Leve</span>
                        <span>😐 Moderada</span>
                        <span>😫 Crítica</span>
                    </div>
                </div>
            </div>

            {/* 3. PREOCUPAÇÕES */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                    Medos e Objeções (Multiseleção)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PREOCUPACOES.map(p => (
                        <button
                            key={p}
                            onClick={() => handleTogglePreocupacao(p)}
                            className={`px-3 py-2 rounded-lg border text-xs text-left transition flex items-center gap-2 ${data.preocupacoes?.includes(p) ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border ${data.preocupacoes?.includes(p) ? 'bg-red-500 border-red-500' : 'border-gray-300'}`} />
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. EXPERIÊNCIAS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
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
                            className={`p-3 rounded-lg border text-xs font-medium transition ${data.experienciaAnterior === e ? 'bg-gray-800 text-white' : 'hover:bg-gray-50'}`}
                        >
                            {e}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium">← Voltar para Início</button>
                <button
                    onClick={onNext}
                    disabled={!data.gatilho}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition transform disabled:opacity-50 disabled:scale-100"
                >
                    Próxima: Dados Pessoais →
                </button>
            </div>
        </div>
    );
}
