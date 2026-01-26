import React from 'react';

export interface ClinicalData {
    condicoes: {
        neurologico: string[];
        cardiovascular: string[];
        respiratorio: string[];
        mobilidade: string[];
        endocrino: string[];
        psiquiatrico: string[];
        gastro: string[];
        outros: string;
    };
    quedas: string;
    medicamentos: {
        total: string;
        lista: string;
        alergias: string;
        restricoes: string;
    };
    dispositivos: string[];
}

interface StepClinicalProps {
    data: ClinicalData;
    onUpdate: (data: Partial<ClinicalData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepClinical({ data, onUpdate, onNext, onBack }: StepClinicalProps) {
    const CONDITIONS = {
        neurologico: ['Alzheimer (Inicial)', 'Alzheimer (Moderado)', 'Alzheimer (Avançado)', 'Parkinson', 'AVC/Derrame (Sequelas Leves)', 'AVC/Derrame (Sequelas Graves)', 'Demência Vascular', 'Corpos de Lewy', 'Traumatismo Craniano', 'Esclerose Múltipla', 'Epilepsia/Convulsões', 'Tremor Essencial'],
        cardiovascular: ['Hipertensão (Controlada)', 'Hipertensão (Descontrolada)', 'Insuficiência Cardíaca', 'Arritmia', 'Portador de Marcapasso', 'Angina/Infarto Prévio', 'Trombose/TVP', 'Varizes Severas', 'Aneurisma'],
        respiratorio: ['DPOC', 'Asma', 'Embalia Pulmonar', 'Fibrose Pulmonar', 'Pneumonia Recente', 'Uso Ocasional de O2', 'Uso Contínuo de O2 (Domiciliar)', 'Traqueostomia'],
        mobilidade: ['Artrose/Artrite', 'Osteoporose', 'Fratura de Fêmur Recente', 'Prótese de Quadril/Joelho', 'Amputação', 'Cadeirante', 'Acamado', 'Andador/Bengala', 'Risco de Queda Elevado'],
        endocrino: ['Diabetes Tipo 1 (Insulina)', 'Diabetes Tipo 2 (Oral)', 'Hipotireoidismo', 'Obesidade Mórbida', 'Desnutrição'],
        psiquiatrico: ['Depressão', 'Ansiedade Generalizada', 'Bipolaridade', 'Esquizofrenia', 'Síndrome do Pânico'],
        gastro: ['Gastrite/Refluxo', 'Constipação Crônica', 'Incontinência Fecal', 'Uso de Colostomia', 'Disfagia (Engasgo)'],
    };

    const DISPOSITIVOS = [
        'Óculos', 'Aparelho Auditivo', 'Dentadura/Prótese',
        'Andador', 'Bengala', 'Cadeira de Rodas', 'Cadeira de Banho',
        'Cama Hospitalar', 'Colchão Pneumático', 'Guincho', 'Barra de Apoio'
    ];

    const toggleCondition = (category: keyof ClinicalData['condicoes'], item: string) => {
        const currentList = (data.condicoes[category] || []) as string[];
        const newList = currentList.includes(item)
            ? currentList.filter(i => i !== item)
            : [...currentList, item];

        onUpdate({
            condicoes: { ...data.condicoes, [category]: newList }
        });
    };

    const toggleDispositivo = (d: string) => {
        const list = data.dispositivos || [];
        onUpdate({ dispositivos: list.includes(d) ? list.filter(i => i !== d) : [...list, d] });
    };

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Etapa 3/9: Mapeamento Clínico</h1>
                <p className="text-gray-500">Inventário completo de saúde, riscos e dispositivos.</p>
            </div>

            {/* DIAGNÓSTICOS GRID */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">1. Diagnósticos e Condições</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(CONDITIONS).map(([key, items]) => (
                        <div key={key}>
                            <h4 className="text-xs font-black text-gray-400 uppercase mb-2 tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span> {key}
                            </h4>
                            <div className="space-y-1">
                                {items.map(item => (
                                    <label key={item} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 rounded mt-0.5"
                                            checked={(data.condicoes[key as keyof typeof CONDITIONS] as string[])?.includes(item)}
                                            onChange={() => toggleCondition(key as keyof typeof CONDITIONS, item)}
                                        />
                                        <span className="text-xs md:text-sm text-gray-700 leading-tight">{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t">
                    <label className="text-xs font-bold text-gray-400 uppercase">Outras Observações Clínicas</label>
                    <textarea
                        className="w-full border p-2 rounded text-sm h-20"
                        placeholder="Ex: Histórico de câncer, cirurgias antigas relevante..."
                        value={data.condicoes.outros}
                        onChange={e => onUpdate({ condicoes: { ...data.condicoes, outros: e.target.value } })}
                    />
                </div>
            </div>

            {/* RISCOS E DISPOSITIVOS */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">2. Histórico de Quedas</h3>
                    <div className="flex flex-col gap-2">
                        {['Nenhuma queda relatada', 'Queda < 1 mês (Alto Risco)', 'Queda 1-3 meses', 'Queda 3-6 meses', 'Queda > 1 ano', 'Quedas frequentes/recorrentes', 'Queda com fratura grave', 'Medo excessivo de cair'].map(opt => (
                            <button
                                key={opt}
                                onClick={() => onUpdate({ quedas: data.quedas === opt ? '' : opt })}
                                className={`p-3 rounded-lg text-sm font-medium border text-left transition ${data.quedas === opt
                                        ? (opt.includes('Alto') || opt.includes('frequentes') ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300')
                                        : 'hover:bg-gray-50'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">3. Dispositivos de Auxílio</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {DISPOSITIVOS.map(d => (
                            <button
                                key={d}
                                onClick={() => toggleDispositivo(d)}
                                className={`p-2 rounded border text-xs text-left transition ${data.dispositivos?.includes(d) ? 'bg-purple-100 text-purple-700 border-purple-300' : 'hover:bg-gray-50'}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* FARMÁCIA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="font-bold text-gray-800 border-b pb-2">4. Farmácia e Restrições</h3>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Volume de Medicamentos</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'Nenhum', val: '0', color: 'bg-gray-100 text-gray-600' },
                            { label: '1-3 (Baixo)', val: '1-3', color: 'bg-green-50 text-green-700' },
                            { label: '4-7 (Médio)', val: '4-7', color: 'bg-yellow-50 text-yellow-700' },
                            { label: '8+ (Polifarmácia)', val: '8+', color: 'bg-red-50 text-red-700' }
                        ].map(opt => (
                            <button
                                key={opt.val}
                                onClick={() => onUpdate({ medicamentos: { ...data.medicamentos, total: data.medicamentos.total === opt.val ? '' : opt.val } })}
                                className={`py-2 px-1 text-xs rounded-lg border font-medium ${data.medicamentos.total === opt.val ? `border-current ${opt.color} ring-1 ring-black/5` : 'border-gray-200 text-gray-500'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Lista de Medicamentos (Foto/Texto)</label>
                        <textarea
                            className="w-full border p-3 rounded" rows={4}
                            placeholder="Insira os principais medicamentos..."
                            value={data.medicamentos.lista}
                            onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, lista: e.target.value } })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 text-red-600">Alergias e Restrições ⚠️</label>
                        <textarea
                            className="w-full border p-3 rounded border-red-100 bg-red-50" rows={4}
                            placeholder="ALERGIAS A DIPIRONA, JANTAR CEDO, NÃO GOSTA DE..."
                            value={data.medicamentos.alergias}
                            onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, alergias: e.target.value } })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700"
                >
                    Próxima: ABEMID →
                </button>
            </div>
        </div>
    );
}
