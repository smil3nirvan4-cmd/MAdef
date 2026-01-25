import type { ABEMIDEvaluation, ComplexidadeNivel } from '@/types/evaluation';

/**
 * AVALIAÇÃO ABEMID - ATENÇÃO DOMICILIAR
 * 
 * Este módulo implementa o algoritmo de classificação ABEMID (Associação Brasileira
 * de Empresas de Medicina Domiciliar) para determinar a elegibilidade e o nível
 * de complexidade de pacientes para atendimento domiciliar.
 * 
 * O algoritmo considera três dimensões principais:
 * 1. Elegibilidade: Critérios obrigatórios para admissão no programa
 * 2. Suporte Terapêutico: Procedimentos e dispositivos em uso
 * 3. Grau de Dependência: Capacidade funcional do paciente
 * 
 * A pontuação final determina:
 * - Nível de complexidade (Baixa, Média, Alta)
 * - Horas de assistência recomendadas (6h, 12h, 24h)
 * - Tipo de profissional necessário
 */

/**
 * Pontuação por tipo de suporte terapêutico.
 * Itens com 5 pontos são considerados "críticos" e afetam a classificação final.
 * - 5 pontos: Procedimentos de alta complexidade (diálise, traqueostomia com aspiração, acesso venoso contínuo)
 * - 3 pontos: Procedimentos de média complexidade (sondas, acesso intermitente)
 * - 1-2 pontos: Procedimentos de baixa complexidade (via oral, subcutânea)
 */
const PONTUACAO_SUPORTE: Record<string, number> = {
    dialise: 5,
    traqueostomiaComAspiracao: 5,
    traqueostomiaSemAspiracao: 3,
    acessoVenosoContínuo: 5,
    acessoVenosoIntermitente: 3,
    sondaVesicalPermanente: 3,
    sondaVesicalIntermitente: 3,
    viaOral: 1,
    viaSubcutanea: 2,
    viaIntravenosa: 3,
    aspiracaoViasAereas: 3,
};

/**
 * Pontuação por grau de dependência funcional.
 * Baseado na capacidade do paciente realizar Atividades de Vida Diária (AVDs).
 * - independente: Realiza AVDs sem auxílio
 * - parcial: Necessita auxílio em algumas AVDs
 * - total: Dependente completo para todas as AVDs
 */
const PONTUACAO_DEPENDENCIA: Record<string, number> = {
    independente: 1,
    parcial: 3,
    total: 5,
};

export interface ABEMIDResult {
    pontuacaoTotal: number;
    nivel: ComplexidadeNivel;
    horasAssistencia: 0 | 6 | 12 | 24;
    elegivel: boolean;
    motivoInelegibilidade?: string;
    itensCriticos: number; // Quantidade de itens com 5 pontos
}

export function calcularABEMID(avaliacao: ABEMIDEvaluation): ABEMIDResult {
    // 1. Verificar elegibilidade
    const { cuidadorIntegral, domicilioSeguro, impedimentoDeslocamento } = avaliacao.elegibilidade;

    if (!cuidadorIntegral) {
        return {
            pontuacaoTotal: 0,
            nivel: 'NAO_ELEGIVEL',
            horasAssistencia: 0,
            elegivel: false,
            motivoInelegibilidade: 'Não possui cuidador em período integral',
            itensCriticos: 0,
        };
    }

    if (!domicilioSeguro) {
        return {
            pontuacaoTotal: 0,
            nivel: 'NAO_ELEGIVEL',
            horasAssistencia: 0,
            elegivel: false,
            motivoInelegibilidade: 'Domicílio apresenta riscos',
            itensCriticos: 0,
        };
    }

    if (!impedimentoDeslocamento) {
        return {
            pontuacaoTotal: 0,
            nivel: 'NAO_ELEGIVEL',
            horasAssistencia: 0,
            elegivel: false,
            motivoInelegibilidade: 'Paciente pode se deslocar até a rede credenciada (sem impedimento)',
            itensCriticos: 0,
        };
    }


    // 2. Calcular pontuação do suporte terapêutico
    let pontuacaoSuporte = 0;
    let itensCriticos = 0;

    for (const [item, ativo] of Object.entries(avaliacao.suporteTerapeutico)) {
        if (ativo) {
            const pontos = PONTUACAO_SUPORTE[item] || 0;
            pontuacaoSuporte += pontos;
            if (pontos === 5) itensCriticos++;
        }
    }

    // 3. Calcular pontuação da dependência
    const pontuacaoDependencia = PONTUACAO_DEPENDENCIA[avaliacao.grauDependencia];

    // 4. Total
    const pontuacaoTotal = pontuacaoSuporte + pontuacaoDependencia;

    // 5. Determinar nível (com regras especiais)
    let nivel: ComplexidadeNivel;
    let horasAssistencia: 0 | 6 | 12 | 24;

    // Regra especial: 2+ itens com 5 pontos → ALTA automaticamente
    if (itensCriticos >= 2) {
        nivel = 'ALTA';
        horasAssistencia = 24;
    }
    // Regra especial: 1 item com 5 pontos → MÉDIA automaticamente
    else if (itensCriticos === 1 && pontuacaoTotal < 13) {
        nivel = 'MEDIA';
        horasAssistencia = 12;
    }
    // Pontuação normal
    else if (pontuacaoTotal < 7) {
        nivel = 'NAO_ELEGIVEL';
        horasAssistencia = 0;
    } else if (pontuacaoTotal < 13) {
        nivel = 'BAIXA';
        horasAssistencia = 6;
    } else if (pontuacaoTotal < 19) {
        nivel = 'MEDIA';
        horasAssistencia = 12;
    } else {
        nivel = 'ALTA';
        horasAssistencia = 24;
    }

    return {
        pontuacaoTotal,
        nivel,
        horasAssistencia,
        elegivel: nivel !== 'NAO_ELEGIVEL',
        itensCriticos,
    };
}
