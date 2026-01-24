import type { ComplexidadeNivel, TipoProfissional } from '@/types/evaluation';

// Tabela de preços por hora
const TABELA_PRECOS: Record<TipoProfissional, { diurno: number; noturno: number; feriado: number }> = {
    CUIDADOR: { diurno: 15.00, noturno: 18.00, feriado: 22.50 },
    AUXILIAR_ENF: { diurno: 22.00, noturno: 26.40, feriado: 33.00 },
    TECNICO_ENF: { diurno: 30.00, noturno: 36.00, feriado: 45.00 },
};

// Multiplicador por complexidade
const MULTIPLICADOR_COMPLEXIDADE: Record<ComplexidadeNivel, number> = {
    NAO_ELEGIVEL: 0,
    BAIXA: 1.0,
    MEDIA: 1.25,
    ALTA: 1.50,
};

// Taxa administrativa
const TAXA_ADMINISTRATIVA = 0.20;

export interface OrcamentoInput {
    tipoProfissional: TipoProfissional;
    complexidade: ComplexidadeNivel;
    horasDiarias: number;
    duracaoDias: number;
    incluirNoturno?: boolean;
    feriados?: number; // quantidade de dias de feriado
}

export interface OrcamentoOutput {
    valorHora: number;
    horasTotais: number;
    subtotal: number;
    adicionalComplexidade: number;
    adicionalNoturno: number;
    adicionalFeriado: number;
    taxaAdministrativa: number;
    total: number;
    demandaEquipe: boolean;
    quantidadeCuidadores: number;
    parcelamento: {
        entrada: number;
        quantidadeParcelas: number;
        valorParcela: number;
    };
    detalhamento: {
        descricao: string;
        valor: number;
    }[];
}

export interface OrcamentoCenarios {
    economico: OrcamentoOutput;
    recomendado: OrcamentoOutput;
    premium: OrcamentoOutput;
}

/**
 * Gera 3 cenários de orçamento para validação do avaliador
 */
export function calcularOrcamentoCenarios(input: OrcamentoInput): OrcamentoCenarios {
    // 1. Cenário Recomendado (Input Original)
    const recomendado = calcularOrcamento(input);

    // 2. Cenário Econômico
    // Reduz complexidade em 1 nível (se possível) ou usa profissional base
    // Exemplo: Se pediu TÉCNICO, tenta orçar com CUIDADOR + Supervisão (simulado)
    const inputEconomico = { ...input };
    if (input.tipoProfissional === 'TECNICO_ENF') inputEconomico.tipoProfissional = 'AUXILIAR_ENF';
    else if (input.tipoProfissional === 'AUXILIAR_ENF') inputEconomico.tipoProfissional = 'CUIDADOR';

    // Remove adicionais opcionais no econômico (simulação)
    const economico = calcularOrcamento(inputEconomico);


    // 3. Cenário Premium
    // Adiciona margem de supervisão e garante melhor profissional
    const inputPremium = { ...input };
    if (input.tipoProfissional === 'CUIDADOR') inputPremium.tipoProfissional = 'AUXILIAR_ENF';
    else if (input.tipoProfissional === 'AUXILIAR_ENF') inputPremium.tipoProfissional = 'TECNICO_ENF';

    // No Premium, adicionamos uma taxa extra de "Supervisão Enfermagem Semanal"
    // Vamos injetar isso manipulando o resultado (ou criando suporte no input)
    const basePremium = calcularOrcamento(inputPremium);

    // Adicionar item manual ao detalhamento do Premium
    const taxaSupervisao = 600.00; // Valor fixo exemplo
    basePremium.total += taxaSupervisao;
    basePremium.detalhamento.push({
        descricao: 'Supervisão de Enfermagem Semanal (Premium)',
        valor: taxaSupervisao
    });
    // Recalcula parcelamento
    basePremium.parcelamento.entrada = basePremium.total * 0.30;
    basePremium.parcelamento.valorParcela = (basePremium.total - basePremium.parcelamento.entrada) / basePremium.parcelamento.quantidadeParcelas;

    return {
        economico,
        recomendado,
        premium: basePremium
    };
}

// Tornando a função base exportada como helper, mas o foco é a de cenários
export function calcularOrcamento(input: OrcamentoInput): OrcamentoOutput {
    // ... (rest of the existing function logic, no changes needed inside)
    const {
        tipoProfissional,
        complexidade,
        horasDiarias,
        duracaoDias,
        incluirNoturno = false,
        feriados = 0,
    } = input;

    // Verificar elegibilidade
    if (complexidade === 'NAO_ELEGIVEL') {
        throw new Error('Paciente não elegível para atendimento domiciliar');
    }

    // 1. Valor hora base
    const precos = TABELA_PRECOS[tipoProfissional];
    const valorHoraBase = precos.diurno;

    // 2. Calcular horas por tipo
    const diasNormais = duracaoDias - feriados;
    let horasDiurnas = 0;
    let horasNoturnas = 0;
    let horasFeriado = 0;

    if (horasDiarias <= 12) {
        // Plantão diurno apenas
        horasDiurnas = horasDiarias * diasNormais;
        horasFeriado = horasDiarias * feriados;
    } else {
        // Plantão 24h
        horasDiurnas = 12 * diasNormais;
        horasNoturnas = 12 * diasNormais;
        horasFeriado = 24 * feriados;
    }

    // 3. Calcular valores
    const valorDiurno = horasDiurnas * precos.diurno;
    const valorNoturno = horasNoturnas * precos.noturno;
    const valorFeriado = horasFeriado * precos.feriado;

    const subtotal = valorDiurno + valorNoturno + valorFeriado;

    // 4. Aplicar multiplicador de complexidade
    const multiplicador = MULTIPLICADOR_COMPLEXIDADE[complexidade];
    const adicionalComplexidade = subtotal * (multiplicador - 1);
    const totalComComplexidade = subtotal + adicionalComplexidade;

    // 5. Verificar demanda de equipe (>4 dias)
    const demandaEquipe = duracaoDias > 4;
    let quantidadeCuidadores = 1;
    let totalEquipe = totalComComplexidade;

    if (demandaEquipe) {
        // Calcular quantidade de cuidadores para cobertura
        if (horasDiarias === 24) {
            quantidadeCuidadores = 8; // 3 turnos x 7 dias + folguista
        } else if (horasDiarias === 12) {
            quantidadeCuidadores = 4;
        } else {
            quantidadeCuidadores = 2;
        }

        // Ajustar proporcionalmente (não multiplicar direto)
        // Cada cuidador cobre ~40h/semana
        const horasSemanaisTotais = horasDiarias * 7;
        const cuidadoresNecessarios = Math.ceil(horasSemanaisTotais / 40);
        totalEquipe = totalComComplexidade * (cuidadoresNecessarios / 1);
    }

    // 6. Taxa administrativa
    const taxaAdmin = totalEquipe * TAXA_ADMINISTRATIVA;

    // 7. Total final
    const total = totalEquipe + taxaAdmin;

    // 8. Parcelamento
    const entrada = total * 0.30;
    const restante = total - entrada;
    const quantidadeParcelas = Math.min(12, Math.max(1, Math.floor(duracaoDias / 5)));
    const valorParcela = restante / quantidadeParcelas;

    // 9. Detalhamento
    const detalhamento = [
        { descricao: `Horas diurnas (${horasDiurnas}h x R$${precos.diurno.toFixed(2)})`, valor: valorDiurno },
    ];

    if (horasNoturnas > 0) {
        detalhamento.push({
            descricao: `Horas noturnas (${horasNoturnas}h x R$${precos.noturno.toFixed(2)})`,
            valor: valorNoturno,
        });
    }

    if (horasFeriado > 0) {
        detalhamento.push({
            descricao: `Horas feriado (${horasFeriado}h x R$${precos.feriado.toFixed(2)})`,
            valor: valorFeriado,
        });
    }

    if (adicionalComplexidade > 0) {
        detalhamento.push({
            descricao: `Adicional complexidade ${complexidade} (+${((multiplicador - 1) * 100).toFixed(0)}%)`,
            valor: adicionalComplexidade,
        });
    }

    if (demandaEquipe) {
        detalhamento.push({
            descricao: `Equipe (${quantidadeCuidadores} profissionais em escala)`,
            valor: totalEquipe - totalComComplexidade,
        });
    }

    detalhamento.push({
        descricao: 'Taxa administrativa (20%)',
        valor: taxaAdmin,
    });

    return {
        valorHora: valorHoraBase * multiplicador,
        horasTotais: horasDiurnas + horasNoturnas + horasFeriado,
        subtotal,
        adicionalComplexidade,
        adicionalNoturno: valorNoturno,
        adicionalFeriado: valorFeriado,
        taxaAdministrativa: taxaAdmin,
        total,
        demandaEquipe,
        quantidadeCuidadores,
        parcelamento: {
            entrada,
            quantidadeParcelas,
            valorParcela,
        },
        detalhamento,
    };
}
