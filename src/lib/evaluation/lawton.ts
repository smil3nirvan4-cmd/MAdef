import type { LawtonEvaluation } from '@/types/evaluation';

export interface LawtonResult {
    pontuacao: number; // 8-24
    nivel: 'INDEPENDENTE' | 'DEPENDENCIA_PARCIAL' | 'DEPENDENCIA_SEVERA';
    descricao: string;
}

export function calcularLawton(avaliacao: LawtonEvaluation): LawtonResult {
    const pontuacao = Object.values(avaliacao).reduce((sum, val) => sum + val, 0);

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
