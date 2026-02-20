import React from 'react';

export interface ResponsibilitiesData {
    medicamentos: {
        separacao: string;
        administracao: string;
    };
    sinaisVitais: string;
    estimulacao: string;
    banhoHigiene: string;
    roupas: string;
    acompanhamentoExterno: string;
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
                <h1 className="text-3xl font-bold text-foreground">Etapa 7/9: Contrato & Segurança</h1>
                <p className="text-muted-foreground">Definições Logísticas e Risco Ambiental Detalhado.</p>
            </div>

            {/* PARTE A: CLÁUSULAS */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border space-y-6">
                <h3 className="font-bold text-foreground flex items-center gap-2 border-b pb-2">
                    <span className="bg-accent-500/15 text-accent-600 px-2 py-0.5 rounded text-sm">Contrato</span>
                    Cláusulas de Execução
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Separação de Medicamentos</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.medicamentos.separacao} onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, separacao: e.target.value } })}>
                            <option value="Familia">Família separa (Caixa Diária)</option>
                            <option value="CuidadorReceita">Cuidador separa (Conforme Receita Médica - Cópia no Local)</option>
                            <option value="Farmacia">Farmácia Externa (Sachês prontos)</option>
                            <option value="Enfermeiro">Enfermeiro Supervisor (Visita Semanal)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Administração (Dar na boca)</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.medicamentos.administracao} onChange={e => onUpdate({ medicamentos: { ...data.medicamentos, administracao: e.target.value } })}>
                            <option value="Paciente">Paciente toma sozinho (Apenas lembrete)</option>
                            <option value="CuidadorMao">Cuidador entrega na mão (Supervisiona ingestão)</option>
                            <option value="CuidadorBoca">Cuidador administra (Amassa/Dilui/Sonda)</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Insumos (Luvas/Fraldas)</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.insumos} onChange={e => onUpdate({ insumos: e.target.value })}>
                            <option value="Familia">Família fornece todos insumos</option>
                            <option value="Empresa">Empresa fornece (+ taxa mensal)</option>
                            <option value="Hibrido">Família compra fraldas, empresa compra luvas</option>
                            <option value="NaoUsa">Não se aplica</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Refeições do Paciente</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.alimentacao} onChange={e => onUpdate({ alimentacao: e.target.value })}>
                            <option value="FamiliaPronta">Família deixa pronta/congelada (Cuidador aquece)</option>
                            <option value="CuidadorCozinha">Cuidador cozinha o básico (Ex: grelhados, sopas)</option>
                            <option value="Marmitaria">Serviço de Marmitaria Externa</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Higiene e Banho</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.banhoHigiene || ''} onChange={e => onUpdate({ banhoHigiene: e.target.value })}>
                            <option value="Independente">Paciente faz sozinho</option>
                            <option value="Supervisao">Cuidador apenas supervisiona/prepara água</option>
                            <option value="AssistenciaParcial">Cuidador dá banho no chuveiro (Cadeira de banho)</option>
                            <option value="BanhoLeito">Banho no leito (Dependência total)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Trato com Roupas</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.roupas || ''} onChange={e => onUpdate({ roupas: e.target.value })}>
                            <option value="FamiliaLavanderia">Família liga máquina / Lavanderia externa</option>
                            <option value="CuidadorPoeMaquina">Cuidador coloca roupa do paciente na máquina varal</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Sinais Vitais (Aferição/Anotação)</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.sinaisVitais || ''} onChange={e => onUpdate({ sinaisVitais: e.target.value })}>
                            <option value="NaoNecessario">Não necessário ou Família faz</option>
                            <option value="Basico">1x/dia ou SN (Pressão, Temperatura)</option>
                            <option value="ControleRigoroso">Controle Rigoroso (Turno) + Glicemia/Saturação</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Estimulação (Física/Cognitiva)</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.estimulacao || ''} onChange={e => onUpdate({ estimulacao: e.target.value })}>
                            <option value="Nenhuma">Nenhuma / Acamado grave</option>
                            <option value="Leve">Apenas caminhada dentro de casa / Banho de sol</option>
                            <option value="Moderada">Exercícios passivos / Jogos de memória simples</option>
                            <option value="Ativa">Passeios externos regulares no quarteirão/praça</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Limpeza e Arrumação</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.limpeza || ''} onChange={e => onUpdate({ limpeza: e.target.value })}>
                            <option value="QuartoBanheiro">Apenas Quarto e Banheiro do Paciente (Padrão)</option>
                            <option value="AreasComuns">Áreas Comuns usadas pelo paciente (Sala/Cozinha)</option>
                            <option value="NaoIncluido">Não incluído (Diarista externa faz)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">O foco é o paciente. Limpeza pesada não inclusa.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Acompanhamento Externo</label>
                        <select className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all" value={data.acompanhamentoExterno || ''} onChange={e => onUpdate({ acompanhamentoExterno: e.target.value })}>
                            <option value="Nao">Não (Fica apenas em casa)</option>
                            <option value="Ocasional">Consultas médicas ocasionais (Familiar leva/dirige)</option>
                            <option value="Frequente">Terapias/Hospital frequentes (Familiar providencia transporte)</option>
                            <option value="Independente">Cuidador acompanha de Uber/Taxi sozinho</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* PARTE B: CHECKLIST AMBIENTAL */}
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                <h3 className="font-bold text-foreground flex items-center gap-2 border-b pb-2 mb-6">
                    <span className="bg-success-100 text-secondary-600 px-2 py-0.5 rounded text-sm">Segurança</span>
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
                        <label key={k} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all active:scale-[0.98] ${data.checklistAmbiente[k as keyof typeof data.checklistAmbiente] ? 'bg-success-50 border-secondary-500 text-secondary-700 ring-1 ring-secondary-500 shadow-sm' : 'bg-background border-border text-foreground hover:bg-surface-subtle hover:border-primary/30'}`}>
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-secondary-600 rounded accent-secondary-600"
                                checked={data.checklistAmbiente[k as keyof typeof data.checklistAmbiente] || false}
                                onChange={() => handleChecklistToggle(k as any)}
                            />
                            <span className="text-xs font-bold uppercase">{label}</span>
                        </label>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                    <label className="text-sm font-bold text-foreground mb-1">Observações de Risco</label>
                    <input
                        className="w-full border border-border-hover p-3 rounded-lg text-sm bg-background focus:bg-card focus:ring-2 focus:ring-ring focus:border-primary-500 outline-none transition-all"
                        placeholder="Ex: Escada caracol perigosa, animal de estimação agressivo..."
                        value={data.observacoes || ''}
                        onChange={e => onUpdate({ observacoes: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t pb-12">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground font-medium">← Voltar</button>
                <button onClick={onNext} className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-primary">Próxima: Proposta Comercial →</button>
            </div>
        </div>
    );
}
