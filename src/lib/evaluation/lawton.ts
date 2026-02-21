import type { LawtonEvaluation } from '@/types/evaluation';

export interface LawtonResult {
    pontuacao: number; // 8-24
    nivel: 'INDEPENDENTE' | 'DEPENDENCIA_PARCIAL' | 'DEPENDENCIA_SEVERA';
    descricao: string;
}

const LAWTON_FIELDS: (keyof LawtonEvaluation)[] = [
    'telefone',
    'compras',
    'cozinhar',
    'tarefasDomesticas',
    'lavanderia',
    'transporte',
    'medicacao',
    'financas',
];

function clampScore(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.max(1, Math.min(3, Math.round(num)));
}

export function calcularLawton(avaliacao: LawtonEvaluation): LawtonResult {
    const pontuacao = LAWTON_FIELDS.reduce((sum, field) => sum + clampScore(avaliacao[field]), 0);

    let nivel: LawtonResult['nivel'];
    let descricao: string;

    if (pontuacao >= 20) {
        nivel = 'INDEPENDENTE';
        descricao = 'Independente para atividades instrumentais';
    } else if (pontuacao >= 13) {
        nivel = 'DEPENDENCIA_PARCIAL';
        descricao = 'Dependência parcial para atividades instrumentais';
    } else {
        nivel = 'DEPENDENCIA_SEVERA';
        descricao = 'Dependência severa para atividades instrumentais';
    }

    return { pontuacao, nivel, descricao };
}
