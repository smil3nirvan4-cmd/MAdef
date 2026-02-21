import type { KATZEvaluation } from '@/types/evaluation';

export interface KATZResult {
    pontuacao: number; // 0-6
    classificacao: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    descricao: string;
    atividadesDependentes: string[];
    atividadesParciais: string[];
}

type KatzStatus = KATZEvaluation['banho'];

const KATZ_ACTIVITIES = ['banho', 'vestir', 'higiene', 'transferencia', 'continencia', 'alimentacao'] as const;
const KATZ_LABELS: Record<typeof KATZ_ACTIVITIES[number], string> = {
    banho: 'Banho',
    vestir: 'Vestir',
    higiene: 'Higiene',
    transferencia: 'Transferência',
    continencia: 'Continência',
    alimentacao: 'Alimentação',
};

const VALID_VALUES = new Set<string>(['independente', 'parcial', 'dependente']);

function normalizeStatus(value: unknown): KatzStatus {
    const str = String(value || '').trim().toLowerCase();
    if (VALID_VALUES.has(str)) return str as KatzStatus;
    return 'dependente';
}

export function calcularKATZ(avaliacao: KATZEvaluation): KATZResult {
    const atividades = KATZ_ACTIVITIES.map((key) => ({
        nome: KATZ_LABELS[key],
        valor: normalizeStatus(avaliacao[key]),
    }));

    const independentes = atividades.filter((a) => a.valor === 'independente');
    const parciais = atividades.filter((a) => a.valor === 'parcial');
    const dependentes = atividades.filter((a) => a.valor === 'dependente');

    // Katz original: 'parcial' counts as dependent
    const pontuacao = independentes.length;

    let classificacao: KATZResult['classificacao'];
    let descricao: string;

    switch (pontuacao) {
        case 6:
            classificacao = 'A';
            descricao = 'Independente em todas as atividades';
            break;
        case 5:
            classificacao = 'B';
            descricao = 'Independente em 5 atividades, dependente em 1';
            break;
        case 4:
            classificacao = 'C';
            descricao = 'Independente em 4 atividades, dependente em 2';
            break;
        case 3:
            classificacao = 'D';
            descricao = 'Independente em 3 atividades, dependente em 3';
            break;
        case 2:
            classificacao = 'E';
            descricao = 'Independente em 2 atividades, dependente em 4';
            break;
        case 1:
            classificacao = 'F';
            descricao = 'Independente em 1 atividade, dependente em 5';
            break;
        default:
            classificacao = 'G';
            descricao = 'Dependente em todas as atividades';
    }

    return {
        pontuacao,
        classificacao,
        descricao,
        atividadesDependentes: dependentes.map((a) => a.nome),
        atividadesParciais: parciais.map((a) => a.nome),
    };
}
