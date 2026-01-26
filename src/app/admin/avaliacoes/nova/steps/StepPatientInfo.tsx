import React from 'react';

export interface PatientInfoData {
    nome: string;
    dataNascimento: string;
    cpf: string;
    telefone: string;
    sexo: 'M' | 'F' | 'Outro' | '';
    peso: string;
    altura: string;
    estadoCivil: string;
    religiao: string;
    endereco: string;
    profissaoAnterior: string;
    hobbies: string;
    temperamento: string[]; // Alterado para array
    rotina: {
        acorda: string;
        cafe: string;
        lancheManha: string;
        almoco: string;
        lancheTarde: string;
        jantar: string;
        ceia: string;
        dormir: string;
    };
    sono: string;
    preferenciasAlimentares: string;
}

interface StepPatientInfoProps {
    data: PatientInfoData;
    onUpdate: (data: Partial<PatientInfoData>) => void;
    onNext: () => void;
    onBack: () => void;
}

// Opções Expandidas
const TEMPERAMENTOS = [
    'Calmo e tranquilo', 'Comunicativo e sociável', 'Reservado/Timido',
    'Ansioso/Preocupado', 'Irritável/Impaciente', 'Deprimido/Apático',
    'Varia muito (Labilidade)', 'Desconfiado', 'Agressivo (Verbal)',
    'Agressivo (Físico)', 'Carinhoso', 'Opositor/Teimoso',
    'Confuso', 'Alucinado', 'Manipulador', 'Colaborativo',
    'Dependente Emocional', 'Indiferente', 'Choroso', 'Risos imotivados',
    'Gosta de mandar', 'Dócil'
];

const SONO = [
    'Dorme a noite toda', 'Acorda 1-2x (Banheiro)', 'Acorda muitas vezes',
    'Insônia inicial (Demora pegar no sono)', 'Insônia terminal (Acorda cedo)',
    'Troca o dia pela noite', 'Agitação noturna (Sundowner)', 'Grita/Fala dormindo',
    'Sonambulismo', 'Apnéia/Ronco forte', 'Dorme muito durante o dia',
    'Pesadelos frequentes', 'Levanta para comer', 'Cai da cama'
];

export default function StepPatientInfo({ data, onUpdate, onNext, onBack }: StepPatientInfoProps) {
    const handleToggleTemperamento = (t: string) => {
        const list = data.temperamento || [];
        if (list.includes(t)) {
            onUpdate({ temperamento: list.filter(i => i !== t) });
        } else {
            onUpdate({ temperamento: [...list, t] });
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Etapa 2/9: Perfil Social Detalhado</h1>
                <p className="text-gray-500">Mapeando a biografia, rotina e personalidade.</p>
            </div>

            {/* DADOS CADASTRAIS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="col-span-full font-bold text-gray-800 border-b pb-4 mb-4">1. Dados Biométricos e Civis</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <input placeholder="Nome Completo" className="border p-3 rounded" value={data.nome} onChange={e => onUpdate({ nome: e.target.value })} />
                    <input type="date" className="border p-3 rounded" value={data.dataNascimento} onChange={e => onUpdate({ dataNascimento: e.target.value })} />
                    <input placeholder="CPF" className="border p-3 rounded" value={data.cpf} onChange={e => onUpdate({ cpf: e.target.value })} />
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                    <input placeholder="Telefone" className="border p-3 rounded" value={data.telefone} onChange={e => onUpdate({ telefone: e.target.value })} />
                    <select className="border p-3 rounded bg-white" value={data.sexo} onChange={e => onUpdate({ sexo: e.target.value as any })}>
                        <option value="">Sexo</option><option value="M">Masculino</option><option value="F">Feminino</option>
                    </select>
                    <input placeholder="Peso (kg)" className="border p-3 rounded" value={data.peso} onChange={e => onUpdate({ peso: e.target.value })} />
                    <input placeholder="Altura (m)" className="border p-3 rounded" value={data.altura} onChange={e => onUpdate({ altura: e.target.value })} />
                </div>
            </div>

            {/* HISTORIA E PERSONALIDADE */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <h3 className="font-bold text-gray-800 border-b pb-2">2. História e Personalidade</h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Profissão Anterior</label>
                        <input className="w-full border p-3 rounded" value={data.profissaoAnterior} onChange={e => onUpdate({ profissaoAnterior: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Religião / Crença (Importante p/ dieta/costumes)</label>
                        <input className="w-full border p-3 rounded" value={data.religiao} onChange={e => onUpdate({ religiao: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">Hobbies e Interesses (Detalhar)</label>
                    <textarea className="w-full border p-3 rounded bg-gray-50" rows={3} placeholder="Ex: Gosta de Baralho, Futebol (Time X), Música Sertaneja, Tricô..." value={data.hobbies} onChange={e => onUpdate({ hobbies: e.target.value })} />
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-3 font-bold">Temperamento Predominante (Multiseleção)</label>
                    <div className="flex flex-wrap gap-2">
                        {TEMPERAMENTOS.map(t => (
                            <button
                                key={t}
                                onClick={() => handleToggleTemperamento(t)}
                                className={`px-3 py-1.5 rounded-full text-xs border transition ${data.temperamento?.includes(t) ? 'bg-purple-100 text-purple-700 border-purple-300 font-bold' : 'hover:bg-gray-50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ROTINA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 border-b pb-4 mb-4">3. Rotina Diária</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
                    {['acorda', 'cafe', 'lancheManha', 'almoco', 'lancheTarde', 'jantar', 'ceia', 'dormir'].map((key) => (
                        <div key={key}>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                                type="time"
                                className="w-full border p-1 rounded text-sm"
                                value={(data.rotina as any)[key] || ''}
                                onChange={e => onUpdate({
                                    rotina: { ...data.rotina, [key]: e.target.value }
                                })}
                            />
                        </div>
                    ))}
                </div>

                <h4 className="text-sm font-bold text-gray-700 mb-3">Qualidade do Sono</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                    {SONO.map(s => (
                        <button
                            key={s}
                            onClick={() => onUpdate({ sono: data.sono === s ? '' : s })}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition ${data.sono === s ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300' : 'hover:bg-gray-50'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">Preferências Alimentares / Restrições Culturais</label>
                    <textarea className="w-full border p-3 rounded" rows={2} placeholder="Ex: Não come carne vermelha, prefere sopa à noite..." value={data.preferenciasAlimentares} onChange={e => onUpdate({ preferenciasAlimentares: e.target.value })} />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium">← Voltar</button>
                <button onClick={onNext} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700">Próxima: Clínico →</button>
            </div>
        </div>
    );
}
