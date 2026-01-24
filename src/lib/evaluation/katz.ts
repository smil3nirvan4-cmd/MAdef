import type { KATZEvaluation } from '@/types/evaluation';

export interface KATZResult {
    pontuacao: number; // 0-6
    classificacao: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
    descricao: string;
    atividadesDependentes: string[];
}

export function calcularKATZ(avaliacao: KATZEvaluation): KATZResult {
    const atividades = [
        { nome: 'Banho', valor: avaliacao.banho },
        { nome: 'Vestir', valor: avaliacao.vestir },
        { nome: 'Higiene', valor: avaliacao.higiene },
        { nome: 'Transferência', valor: avaliacao.transferencia },
        { nome: 'Continência', valor: avaliacao.continencia },
        { nome: 'Alimentação', valor: avaliacao.alimentacao },
    ];

    const independentes = atividades.filter(a => a.valor === 'independente');
    const dependentes = atividades.filter(a => a.valor === 'dependente');

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
        atividadesDependentes: dependentes.map(a => a.nome),
    };
}
