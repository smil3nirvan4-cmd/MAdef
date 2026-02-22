'use client';

import React, { useState } from 'react';
import { maskCPF, validateCPF, maskPhone, maskWeight, maskHeight } from '@/lib/masks';
import { validateBrazilianPhone } from '@/lib/phone-validator';

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
    temperamento: string[];
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

const inputBase = 'w-full border border-border-hover p-3 rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all';

export default function StepPatientInfo({ data, onUpdate, onNext, onBack }: StepPatientInfoProps) {
    const [cpfError, setCpfError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [phoneCorrected, setPhoneCorrected] = useState(false);

    const handleToggleTemperamento = (t: string) => {
        const list = data.temperamento || [];
        if (list.includes(t)) {
            onUpdate({ temperamento: list.filter(i => i !== t) });
        } else {
            onUpdate({ temperamento: [...list, t] });
        }
    };

    const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = maskCPF(e.target.value);
        onUpdate({ cpf: masked });
        const digits = masked.replace(/\D/g, '');
        if (digits.length === 11) {
            setCpfError(validateCPF(digits) ? '' : 'CPF invalido');
        } else {
            setCpfError('');
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
        const result = validateBrazilianPhone(digits);

        if (result.corrected && result.ddd && result.number) {
            const correctedDigits = `${result.ddd}${result.number}`;
            onUpdate({ telefone: maskPhone(correctedDigits) });
            setPhoneCorrected(true);
            setPhoneError('');
        } else {
            onUpdate({ telefone: maskPhone(digits) });
            setPhoneCorrected(false);
            if (digits.length >= 10 && !result.isValid) {
                setPhoneError(result.error || 'Telefone invalido');
            } else {
                setPhoneError('');
            }
        }
    };

    const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ peso: maskWeight(e.target.value) });
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ altura: maskHeight(e.target.value) });
    };

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground">Etapa 2/9: Perfil Social Detalhado</h1>
                <p className="text-muted-foreground">Mapeando a biografia, rotina e personalidade.</p>
            </div>

            {/* DADOS CADASTRAIS */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="col-span-full font-bold text-foreground border-b pb-4 mb-4">1. Dados Biométricos e Civis</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nome Completo</label>
                        <input
                            placeholder="Nome Completo"
                            className={inputBase}
                            value={data.nome}
                            onChange={e => onUpdate({ nome: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Data de Nascimento</label>
                        <input
                            type="date"
                            className={inputBase}
                            value={data.dataNascimento}
                            onChange={e => onUpdate({ dataNascimento: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">CPF</label>
                        <input
                            placeholder="000.000.000-00"
                            className={`${inputBase} ${cpfError ? 'border-error-500 bg-error-50' : ''}`}
                            value={data.cpf}
                            onChange={handleCPFChange}
                            maxLength={14}
                        />
                        {cpfError && <p className="text-xs text-error-600 mt-1">{cpfError}</p>}
                    </div>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Telefone</label>
                        <input
                            placeholder="(00) 00000-0000"
                            className={`${inputBase} ${phoneError ? 'border-error-500 bg-error-50' : ''}`}
                            value={data.telefone}
                            onChange={handlePhoneChange}
                            maxLength={15}
                        />
                        {phoneError && <p className="text-xs text-error-600 mt-1">{phoneError}</p>}
                        {phoneCorrected && <p className="text-xs text-primary mt-1">Digito 9 adicionado automaticamente</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Sexo</label>
                        <select
                            className={inputBase}
                            value={data.sexo}
                            onChange={e => onUpdate({ sexo: e.target.value as PatientInfoData['sexo'] })}
                        >
                            <option value="">Selecione</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Peso</label>
                        <div className="relative">
                            <input
                                placeholder="75,5"
                                className={`${inputBase} pr-10`}
                                value={data.peso}
                                onChange={handleWeightChange}
                                inputMode="decimal"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">kg</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Altura</label>
                        <div className="relative">
                            <input
                                placeholder="1,70"
                                className={`${inputBase} pr-8`}
                                value={data.altura}
                                onChange={handleHeightChange}
                                inputMode="decimal"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">m</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* HISTORIA E PERSONALIDADE */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <h3 className="font-bold text-foreground border-b pb-2">2. História e Personalidade</h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-foreground mb-1">Profissão Anterior</label>
                        <input className={inputBase} value={data.profissaoAnterior} onChange={e => onUpdate({ profissaoAnterior: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm text-foreground mb-1">Religião / Crença</label>
                        <input className={inputBase} value={data.religiao} onChange={e => onUpdate({ religiao: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-1">Hobbies e Interesses (Detalhar)</label>
                    <textarea className={inputBase} rows={3} placeholder="Ex: Gosta de Baralho, Futebol (Time X), Música Sertaneja, Tricô..." value={data.hobbies} onChange={e => onUpdate({ hobbies: e.target.value })} />
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-3 font-bold">Temperamento Predominante (Multiseleção)</label>
                    <div className="flex flex-wrap gap-2">
                        {TEMPERAMENTOS.map(t => (
                            <button
                                key={t}
                                onClick={() => handleToggleTemperamento(t)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-[0.98] ${data.temperamento?.includes(t) ? 'bg-primary-50 text-primary border-primary-500 ring-1 ring-ring' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6 border-t pt-6">
                    <div>
                        <label className="block text-sm text-foreground mb-1 font-bold">Exigências/Preferências (Paciente e Família)</label>
                        <textarea
                            className={inputBase}
                            rows={3}
                            placeholder="Ex: Cuidador comunicativo, que saiba cozinhar..."
                            value={data.exigenciasPreferencias || ''}
                            onChange={e => onUpdate({ exigenciasPreferencias: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-foreground mb-1 font-bold">Traços negativos a evitar no Profissional</label>
                        <textarea
                            className={inputBase}
                            rows={3}
                            placeholder="Ex: Pessoas muito caladas, uso excessivo de celular..."
                            value={data.tracosEvitar || ''}
                            onChange={e => onUpdate({ tracosEvitar: e.target.value })}
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm text-foreground mb-1 font-bold">O que faria o cuidador ser substituído na primeira semana?</label>
                    <textarea
                        className="w-full border border-error-300 p-3 rounded-lg text-sm bg-error-50 text-error-800 placeholder:text-error-300 focus:bg-card focus:ring-2 focus:ring-error-200 focus:border-error-500 outline-none transition-all"
                        rows={2}
                        placeholder="Ex: Faltar sem avisar, ser rude com o paciente..."
                        value={data.motivoSubstituicao || ''}
                        onChange={e => onUpdate({ motivoSubstituicao: e.target.value })}
                    />
                </div>
            </div>

            {/* ROTINA */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="font-bold text-foreground border-b pb-4 mb-4">3. Rotina Diária</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
                    {(['acorda', 'cafe', 'lancheManha', 'almoco', 'lancheTarde', 'jantar', 'ceia', 'dormir'] as const).map((key) => (
                        <div key={key}>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input
                                type="time"
                                className="w-full border border-border-hover p-2 rounded-lg text-sm bg-background text-foreground focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all text-center"
                                value={data.rotina[key] || ''}
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
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] ${data.sono === s ? 'bg-primary-50 text-primary border-primary-500 ring-1 ring-ring shadow-sm' : 'bg-card hover:bg-surface-subtle hover:border-primary/30 text-foreground border-border'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm text-foreground mb-1">Preferências Alimentares / Restrições Culturais</label>
                    <textarea className={inputBase} rows={2} placeholder="Ex: Não come carne vermelha, prefere sopa à noite..." value={data.preferenciasAlimentares} onChange={e => onUpdate({ preferenciasAlimentares: e.target.value })} />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground font-medium transition-colors">&larr; Voltar</button>
                <button onClick={onNext} className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-bold shadow hover:bg-primary-hover transition-colors">Próxima: Clínico &rarr;</button>
            </div>
        </div>
    );
}
