import React from 'react';

export interface AbemidData {
    consciencia: string;
    respiracao: string;
    alimentacao: string;
    medicacao: string;
    pele: string;
    eliminacoes: string;
    observacoes: string;
}

interface StepABEMIDProps {
    data: AbemidData;
    onUpdate: (data: Partial<AbemidData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function StepABEMID({ data, onUpdate, onNext, onBack }: StepABEMIDProps) {
    const handleSelect = (key: keyof AbemidData, val: string) => {
        // Toggle logic: if same value selected, clear it
        if (data[key] === val) {
            onUpdate({ [key]: '' } as any);
        } else {
            onUpdate({ [key]: val } as any);
        }
    };

    const SECTIONS = [
        {
            title: '1. Consciência e Orientação',
            key: 'consciencia',
            options: [
                { val: 'Lucido', label: 'Lucido (Conversa normal)' },
                { val: 'Desorientado Tempo', label: 'Desorientado no Tempo' },
                { val: 'Desorientado Espaco', label: 'Desorientado no Espaço' },
                { val: 'Confuso Leve', label: 'Esquecimentos frequentes' },
                { val: 'Agitado', label: 'Agitação Psicomotora' },
                { val: 'Agressivo', label: 'Agressividade Verbal/Física', alert: true },
                { val: 'Nao Responsivo', label: 'Não responsivo / Coma', alert: true },
                { val: 'Estupor', label: 'Estuporoso' }
            ]
        },
        {
            title: '2. Respiração',
            key: 'respiracao',
            options: [
                { val: 'Ar Ambiente', label: 'Ar Ambiente (Normal)' },
                { val: 'Cansa Esforco', label: 'Cansaço aos esforços' },
                { val: 'O2 Ocasional', label: 'O2 S/N (Cateter)' },
                { val: 'O2 Continuo', label: 'O2 Contínuo (Cilindro/Conc.)' },
                { val: 'Nebulizacao', label: 'Nebulização frequente' },
                { val: 'CPAP/BIPAP', label: 'Uso de CPAP/BiPAP noturno', alert: true },
                { val: 'TQT', label: 'Traqueostomia', alert: true },
                { val: 'Ventilacao', label: 'Ventilação Mecânica', alert: true }
            ]
        },
        {
            title: '3. Alimentação',
            key: 'alimentacao',
            options: [
                { val: 'Oral Livre', label: 'Oral (Sem restrições)' },
                { val: 'Oral Pastosa', label: 'Oral (Pastosa/Cremosa)' },
                { val: 'Oral Liquida', label: 'Oral (Líquida espessada)' },
                { val: 'Assisitida', label: 'Oral (Precisa que dê na boca)' },
                { val: 'SNE', label: 'Sonda Nasoenteral (SNE)', alert: true },
                { val: 'GTT', label: 'Gastrostomia (GTT)', alert: true },
                { val: 'Parenteral', label: 'Nutrição Parenteral (NPT)', alert: true },
                { val: 'Risco Broncoaspiracao', label: 'Alto Risco Broncoaspiração' }
            ]
        },
        {
            title: '4. Terapêutica Medicamentosa',
            key: 'medicacao',
            options: [
                { val: 'Nenhuma', label: 'Não usa medicamentos' },
                { val: 'Oral Autonomo', label: 'Oral (Toma sozinho)' },
                { val: 'Oral Supervisionado', label: 'Oral (Supervisão)' },
                { val: 'Oral Administrado', label: 'Oral (Administrado)' },
                { val: 'Topica', label: 'Tópica (Pomadas/Colírios)' },
                { val: 'Subcutanea', label: 'Subcutânea (Insulina/Clexane)', alert: true },
                { val: 'IM', label: 'Intramuscular', alert: true },
                { val: 'IV', label: 'Intravenosa (Soro/Antibiótico)', alert: true }
            ]
        },
        {
            title: '5. Integridade Cutânea (Pele)',
            key: 'pele',
            options: [
                { val: 'Integra', label: 'Pele Íntegra' },
                { val: 'Ressecada', label: 'Pele Ressecada/Fina' },
                { val: 'Hematomas', label: 'Hematomas/Manchas' },
                { val: 'Dermatite', label: 'Dermatite (Fralda)' },
                { val: 'LPP 1', label: 'Lesão Pressão Grau 1' },
                { val: 'LPP 2', label: 'Lesão Pressão Grau 2 (Aberta)' },
                { val: 'LPP 3', label: 'Lesão Pressão Grau 3 (Profunda)', alert: true },
                { val: 'LPP 4', label: 'Lesão Grau 4 / Necrose', alert: true }
            ]
        },
        {
            title: '6. Eliminações Fisiológicas',
            key: 'eliminacoes',
            options: [
                { val: 'Continente', label: 'Continente (Vai ao wc)' },
                { val: 'Incont Urinaria Ocasional', label: 'Incont. Urinária Ocasional' },
                { val: 'Incont Urinaria Total', label: 'Usa Fralda (Urina)' },
                { val: 'Incont Fecal', label: 'Usa Fralda (Fezes)' },
                { val: 'Bolsa Coletora', label: 'Urostomia/Colostomia' },
                { val: 'SVD', label: 'Sonda Vesical Demora (SVD)', alert: true },
                { val: 'Cistostomia', label: 'Cistostomia', alert: true },
                { val: 'Cateterismo', label: 'Cateterismo Intermitente', alert: true }
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Etapa 4/9: ABEMID Expandido</h1>
                <p className="text-muted-foreground">Avaliação Detalhada de Dependência (Triplicada)</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {SECTIONS.map((section) => (
                    <div key={section.key} className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                            {section.title}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {section.options.map((opt) => (
                                <button
                                    key={opt.val}
                                    onClick={() => handleSelect(section.key as any, opt.val)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border text-left transition-all active:scale-[0.98] flex-grow ${(data as any)[section.key] === opt.val
                                        ? (opt.alert ? 'bg-error-50 text-error-700 border-error-500 ring-1 ring-error-500 shadow-sm' : 'bg-primary-50 text-primary border-primary-500 ring-1 ring-ring shadow-sm')
                                        : 'hover:bg-background hover:border-primary/30 bg-card text-foreground'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-card p-4 rounded-xl border">
                <label className="font-bold text-sm text-foreground">Observações Gerais do ABEMID</label>
                <textarea
                    className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all mt-2 h-20"
                    value={data.observacoes || ''}
                    onChange={e => onUpdate({ observacoes: e.target.value })}
                />
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground">← Voltar</button>
                <button
                    onClick={onNext}
                    className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-primary"
                >
                    Próxima: Escala Katz →
                </button>
            </div>
        </div>
    );
}
