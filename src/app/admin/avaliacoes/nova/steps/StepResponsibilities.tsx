import React from 'react';

export interface ResponsibilitiesData {
    medicamentos: {
        separacao: string;
        administracao: string;
    };
    insumos: string;
    alimentacao: string;
    limpeza: string;
    checklistAmbiente: {
        iluminacaoCorredor: boolean;
        iluminacaoQuarto: boolean;
        iluminacaoBanheiro: boolean;
        tapetesSala: boolean;
        tapetesQuarto: boolean;
        tapetesBanheiro: boolean;
        barrasBox: boolean;
        barrasVaso: boolean;
        pisoBox: boolean;
        degrausEntrada: boolean;
        escadasInternas: boolean;
        corrimadaoEscada: boolean;
        espacoCadeira: boolean;
        interruptoresAcesso: boolean;
        alturaCama: boolean;
        campainhaEmergencia: boolean;
        detectoresFumaca: boolean;
        fiosSoltos: boolean;
    };
    observacoes: string;
}

interface StepResponsibilitiesProps {
    data: ResponsibilitiesData;
    onUpdate: (data: Partial<ResponsibilitiesData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepResponsibilities({ data, onUpdate, onNext, onBack }: StepResponsibilitiesProps) {
    const handleChecklistToggle = (key: keyof ResponsibilitiesData['checklistAmbiente']) => {
        onUpdate({
            checklistAmbiente: {
                ...data.checklistAmbiente,
                [key]: !data.checklistAmbiente[key]
            }
        });
    };

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Etapa 7/9: Contrato & Segurança</h1>
                <p className="text-gray-500">Definições Logísticas e Risco Ambiental Detalhado.</p>
            </div>

            {/* PARTE A: CLÁUSULAS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                    <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-sm">Contrato</span>
                    Cláusulas de Execução
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Separação de Medicamentos</label>
                        <select className="w-full border p-3 rounded bg-gray-50 text-sm" value={data.medicamentos.separacao} onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, separacao: e.target.value } })}>
                            <option value="Familia">Família separa (Caixa Diária)</option>
                            <option value="CuidadorReceita">Cuidador separa (Conforme Receita Médica - Cópia no Local)</option>
                            <option value="Farmacia">Farmácia Externa (Sachês prontos)</option>
                            <option value="Enfermeiro">Enfermeiro Supervisor (Visita Semanal)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Administração (Dar na boca)</label>
                        <select className="w-full border p-3 rounded bg-gray-50 text-sm" value={data.medicamentos.administracao} onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, administracao: e.target.value } })}>
                            <option value="Paciente">Paciente toma sozinho (Apenas lembrete)</option>
                            <option value="CuidadorMao">Cuidador entrega na mão (Supervisiona ingestão)</option>
                            <option value="CuidadorBoca">Cuidador administra (Amassa/Dilui/Sonda)</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Insumos (Luvas/Fraldas)</label>
                        <select className="w-full border p-3 rounded bg-gray-50 text-sm" value={data.insumos} onChange={e => onUpdate({ insumos: e.target.value })}>
                            <option value="Familia">Família fornece todos insumos</option>
                            <option value="Empresa">Empresa fornece (+ taxa mensal)</option>
                            <option value="Hibrido">Família compra fraldas, empresa compra luvas</option>
                            <option value="NaoUsa">Não se aplica</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Refeições do Paciente</label>
                        <select className="w-full border p-3 rounded bg-gray-50 text-sm" value={data.alimentacao} onChange={e => onUpdate({ alimentacao: e.target.value })}>
                            <option value="FamiliaPronta">Família deixa pronta/congelada (Cuidador aquece)</option>
                            <option value="CuidadorCozinha">Cuidador cozinha o básico (Ex: grelhados, sopas)</option>
                            <option value="Marmitaria">Serviço de Marmitaria Externa</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Limpeza e Arrumação</label>
                    <select className="w-full border p-3 rounded bg-gray-50 text-sm" value={data.limpeza || ''} onChange={e => onUpdate({ limpeza: e.target.value })}>
                        <option value="QuartoBanheiro">Apenas Quarto e Banheiro do Paciente (Padrão)</option>
                        <option value="AreasComuns">Áreas Comuns usadas pelo paciente (Sala/Cozinha)</option>
                        <option value="NaoIncluido">Não incluído (Diarista externa faz)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">O foco é o paciente. Limpeza pesada não inclusa.</p>
                </div>
            </div>

            {/* PARTE B: CHECKLIST AMBIENTAL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2 mb-6">
                    <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-sm">Segurança</span>
                    Checklist Ambiental Detalhado
                </h3>

                <div className="grid md:grid-cols-3 gap-2">
                    {[
                        { k: 'iluminacaoCorredor', label: 'Luz Corredor OK' },
                        { k: 'iluminacaoQuarto', label: 'Luz Quarto OK' },
                        { k: 'iluminacaoBanheiro', label: 'Luz Banheiro OK' },
                        { k: 'tapetesSala', label: 'Sala sem tapetes' },
                        { k: 'tapetesQuarto', label: 'Quarto sem tapetes' },
                        { k: 'tapetesBanheiro', label: 'WC sem tapetes' },
                        { k: 'barrasBox', label: 'Barra Apoio Box' },
                        { k: 'barrasVaso', label: 'Barra Apoio Vaso' },
                        { k: 'pisoBox', label: 'Piso Box Antiderrapante' },
                        { k: 'degrausEntrada', label: 'Entrada sem Degraus' },
                        { k: 'escadasInternas', label: 'Sem Escadas Internas' },
                        { k: 'corrimadaoEscada', label: 'Corrimão Firme' },
                        { k: 'espacoCadeira', label: 'Portas > 80cm (Cadeira)' },
                        { k: 'interruptoresAcesso', label: 'Interruptor Acessível' },
                        { k: 'alturaCama', label: 'Altura Cama Adequada' },
                        { k: 'campainhaEmergencia', label: 'Campainha Emergência' },
                        { k: 'detectoresFumaca', label: 'Detector Fumaça' },
                        { k: 'fiosSoltos', label: 'Sem fios soltos' },
                    ].map(({ k, label }) => (
                        <label key={k} className={`flex items-center gap-2 p-3 border rounded cursor-pointer transition ${data.checklistAmbiente[k as keyof typeof data.checklistAmbiente] ? 'bg-green-50 border-green-500 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-green-600 rounded"
                                checked={data.checklistAmbiente[k as keyof typeof data.checklistAmbiente] || false}
                                onChange={() => handleChecklistToggle(k as any)}
                            />
                            <span className="text-xs font-bold uppercase">{label}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <label className="text-sm font-bold text-gray-700">Observações de Risco</label>
                    <input
                        className="w-full border p-3 rounded"
                        placeholder="Ex: Escada caracol perigosa, animal de estimação agressivo..."
                        value={data.observacoes || ''}
                        onChange={e => onUpdate({ observacoes: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium">← Voltar</button>
                <button onClick={onNext} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700">Próxima: Proposta Comercial →</button>
            </div>
        </div>
    );
}
