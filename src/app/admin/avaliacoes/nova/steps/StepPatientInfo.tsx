import React from 'react';
import PhoneInput from '@/components/PhoneInput';
import { maskCPF, validateCPF, maskWeight, maskHeight, unmask } from '@/lib/input-masks';

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
    exigenciasPreferencias: string;
    tracosEvitar: string;
    motivoSubstituicao: string;
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

const INPUT_CLASS = 'w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all';

export default function StepPatientInfo({ data, onUpdate, onNext, onBack }: StepPatientInfoProps) {
    const handleToggleTemperamento = (t: string) => {
        const list = data.temperamento || [];
        if (list.includes(t)) {
            onUpdate({ temperamento: list.filter(i => i !== t) });
        } else {
            onUpdate({ temperamento: [...list, t] });
        }
    };

    const cpfDigits = unmask(data.cpf);
    const cpfValid = cpfDigits.length === 11 ? validateCPF(cpfDigits) : null;

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Etapa 2/9: Perfil Social Detalhado</h1>
                <p className="text-muted-foreground">Mapeando a biografia, rotina e personalidade.</p>
            </div>

            {/* DADOS CADASTRAIS */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="col-span-full font-bold text-foreground border-b pb-4 mb-4">1. Dados Biometricos e Civis</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Nome Completo <span className="text-error-500">*</span></label>
                        <input
                            placeholder="Nome Completo"
                            className={INPUT_CLASS}
                            value={data.nome}
                            onChange={e => onUpdate({ nome: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Data de Nascimento</label>
                        <input
                            type="date"
                            className={INPUT_CLASS}
                            value={data.dataNascimento}
                            onChange={e => onUpdate({ dataNascimento: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">CPF</label>
                        <input
                            placeholder="000.000.000-00"
                            className={`${INPUT_CLASS} ${cpfValid === false ? 'border-error-500 bg-error-50' : ''} ${cpfValid === true ? 'border-secondary-500 bg-success-50' : ''}`}
                            value={maskCPF(data.cpf)}
                            onChange={e => onUpdate({ cpf: unmask(e.target.value) })}
                            maxLength={14}
                        />
                        {cpfValid === false && (
                            <p className="text-xs text-error-600 mt-1">CPF invalido</p>
                        )}
                    </div>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                    <PhoneInput
                        value={data.telefone}
                        onChange={(value) => onUpdate({ telefone: value })}
                        label="Telefone"
                        required
                        placeholder="(45) 99999-9999"
                    />
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Sexo</label>
                        <select
                            className={INPUT_CLASS}
                            value={data.sexo}
                            onChange={e => onUpdate({ sexo: e.target.value as PatientInfoData['sexo'] })}
                        >
                            <option value="">Sexo</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Peso (kg)</label>
                        <input
                            placeholder="Ex: 72.5"
                            className={INPUT_CLASS}
                            value={data.peso}
                            onChange={e => onUpdate({ peso: maskWeight(e.target.value) })}
                            inputMode="decimal"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Altura (m)</label>
                        <input
                            placeholder="Ex: 1.65"
                            className={INPUT_CLASS}
                            value={data.altura}
                            onChange={e => onUpdate({ altura: maskHeight(e.target.value) })}
                            inputMode="decimal"
                        />
                    </div>
                </div>
            </div>

            {/* HISTORIA E PERSONALIDADE */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <h3 className="font-bold text-foreground border-b pb-2">2. Historia e Personalidade</h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-foreground mb-1">Profissao Anterior</label>
                        <input className={INPUT_CLASS} value={data.profissaoAnterior} onChange={e => onUpdate({ profissaoAnterior: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-foreground mb-1">Religiao / Crenca</label>
                        <input className={INPUT_CLASS} value={data.religiao} onChange={e => onUpdate({ religiao: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-1">Hobbies e Interesses (Detalhar)</label>
                    <textarea className={INPUT_CLASS} rows={3} placeholder="Ex: Gosta de Baralho, Futebol (Time X), Musica Sertaneja, Trico..." value={data.hobbies} onChange={e => onUpdate({ hobbies: e.target.value })} />
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-3 font-bold">Temperamento Predominante (Multiselecao)</label>
                    <div className="flex flex-wrap gap-2">
                        {TEMPERAMENTOS.map(t => (
                            <button
                                key={t}
                                onClick={() => handleToggleTemperamento(t)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${data.temperamento?.includes(t) ? 'bg-primary-50 text-primary border-primary-500 ring-1 ring-ring' : 'hover:bg-background hover:border-primary/30 text-foreground'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6 border-t pt-6">
                    <div>
                        <label className="block text-sm text-foreground mb-1 font-bold">Exigencias/Preferencias (Paciente e Familia)</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={3}
                            placeholder="Ex: Cuidador comunicativo, que saiba cozinhar..."
                            value={data.exigenciasPreferencias || ''}
                            onChange={e => onUpdate({ exigenciasPreferencias: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-foreground mb-1 font-bold">Tracos negativos a evitar no Profissional</label>
                        <textarea
                            className={INPUT_CLASS}
                            rows={3}
                            placeholder="Ex: Pessoas muito caladas, uso excessivo de celular..."
                            value={data.tracosEvitar || ''}
                            onChange={e => onUpdate({ tracosEvitar: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm text-foreground mb-1 font-bold">O que faria o cuidador ser substituido na primeira semana?</label>
                    <textarea
                        className="w-full border border-error-300 p-3 rounded-lg text-sm bg-error-50 focus:bg-card focus:ring-2 focus:ring-error-200 focus:border-error-500 outline-none transition-all placeholder:text-error-300 text-error-800"
                        rows={2}
                        placeholder="Ex: Faltar sem avisar, ser rude com o paciente..."
                        value={data.motivoSubstituicao || ''}
                        onChange={e => onUpdate({ motivoSubstituicao: e.target.value })}
                    />
                </div>
            </div>

            {/* ROTINA */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="font-bold text-foreground border-b pb-4 mb-4">3. Rotina Diaria</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
                    {['acorda', 'cafe', 'lancheManha', 'almoco', 'lancheTarde', 'jantar', 'ceia', 'dormir'].map((key) => (
                        <div key={key}>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                                type="time"
                                className="w-full border border-border-hover p-2 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all text-center"
                                value={(data.rotina as Record<string, string>)[key] || ''}
                                onChange={e => onUpdate({
                                    rotina: { ...data.rotina, [key]: e.target.value }
                                })}
                            />
                        </div>
                    ))}
                </div>

                <h4 className="text-sm font-bold text-foreground mb-3">Qualidade do Sono</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                    {SONO.map(s => (
                        <button
                            key={s}
                            onClick={() => onUpdate({ sono: data.sono === s ? '' : s })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] ${data.sono === s ? 'bg-info-50 text-info-700 border-info-500 ring-1 ring-info-500 shadow-sm' : 'hover:bg-background hover:border-primary/30 text-foreground'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-1">Preferencias Alimentares / Restricoes Culturais</label>
                    <textarea className={INPUT_CLASS} rows={2} placeholder="Ex: Nao come carne vermelha, prefere sopa a noite..." value={data.preferenciasAlimentares} onChange={e => onUpdate({ preferenciasAlimentares: e.target.value })} />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground font-medium">← Voltar</button>
                <button onClick={onNext} className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors">Proxima: Clinico →</button>
            </div>
        </div>
    );
}
