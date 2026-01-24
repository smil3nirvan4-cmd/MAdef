export interface ABEMIDEvaluation {
    // GRUPO 1 - ELEGIBILIDADE
    elegibilidade: {
        cuidadorIntegral: boolean;
        domicilioSeguro: boolean;
        impedimentoDeslocamento: boolean;
    };

    // GRUPO 2 - SUPORTE TERAPÊUTICO
    suporteTerapeutico: {
        dialise: boolean;                    // 5 pts
        traqueostomiaComAspiracao: boolean;  // 5 pts
        traqueostomiaSemAspiracao: boolean;  // 3 pts
        acessoVenosoContínuo: boolean;       // 5 pts
        acessoVenosoIntermitente: boolean;   // 3 pts
        sondaVesicalPermanente: boolean;     // 3 pts
        sondaVesicalIntermitente: boolean;   // 3 pts
        viaOral: boolean;                    // 1 pt
        viaSubcutanea: boolean;              // 2 pts
        viaIntravenosa: boolean;             // 3 pts
        aspiracaoViasAereas: boolean;        // 3 pts
    };

    // GRUPO 3 - GRAU DE DEPENDÊNCIA
    grauDependencia: 'independente' | 'parcial' | 'total';
}

export interface KATZEvaluation {
    banho: 'independente' | 'dependente';
    vestir: 'independente' | 'dependente';
    higiene: 'independente' | 'dependente';
    transferencia: 'independente' | 'dependente';
    continencia: 'independente' | 'dependente';
    alimentacao: 'independente' | 'dependente';
}

export interface LawtonEvaluation {
    telefone: 1 | 2 | 3;
    compras: 1 | 2 | 3;
    cozinhar: 1 | 2 | 3;
    tarefasDomesticas: 1 | 2 | 3;
    lavanderia: 1 | 2 | 3;
    transporte: 1 | 2 | 3;
    medicacao: 1 | 2 | 3;
    financas: 1 | 2 | 3;
}

export type ComplexidadeNivel = 'NAO_ELEGIVEL' | 'BAIXA' | 'MEDIA' | 'ALTA';
export type TipoProfissional = 'CUIDADOR' | 'AUXILIAR_ENF' | 'TECNICO_ENF';

export interface PerfilCuidadorNecessario {
    nivel: TipoProfissional;
    horasDiarias: 6 | 12 | 24;
    complexidade: ComplexidadeNivel;
    competencias: {
        suporteVentilatorio: boolean;
        administracaoIV: boolean;
        cuidadosEstoma: boolean;
        mobilizacao: boolean;
        alimentacaoAssistida: boolean;
        higienizacao: boolean;
    };
    demandaEquipe: boolean;
    quantidadeCuidadores: number;
}
