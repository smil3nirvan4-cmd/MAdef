export interface ContratoData {
    orcamentoId: string;
    pacienteNome: string;
    pacienteTelefone: string;
    pacienteCidade?: string | null;
    pacienteBairro?: string | null;
    tipoCuidado?: string | null;
    valorFinal?: number | null;
}

function brl(value?: number | null) {
    if (!value) return 'A combinar';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function buildContratoTemplate(data: ContratoData) {
    const local = [data.pacienteCidade, data.pacienteBairro].filter(Boolean).join(' - ') || 'Não informado';
    const hoje = new Date().toLocaleDateString('pt-BR');

    const lines = [
        'CONTRATO DE PRESTAÇÃO DE SERVIÇOS - MÃOS AMIGAS',
        `Contrato nº: ${data.orcamentoId} | Data: ${hoje}`,
        '',
        'CONTRATANTE',
        `Nome: ${data.pacienteNome || 'Não informado'}`,
        `Telefone: ${data.pacienteTelefone || 'Não informado'}`,
        `Local: ${local}`,
        '',
        'CONTRATADA',
        'Mãos Amigas Home Care',
        '',
        'CLÁUSULA 1 - OBJETO',
        `Prestação de serviço de cuidado ${data.tipoCuidado || 'HOME_CARE'} em favor do contratante.`,
        '',
        'CLÁUSULA 2 - OBRIGAÇÕES DA CONTRATADA',
        'Disponibilizar profissional qualificado e supervisionado.',
        '',
        'CLÁUSULA 3 - OBRIGAÇÕES DO CONTRATANTE',
        'Fornecer informações verídicas e realizar os pagamentos acordados.',
        '',
        'CLÁUSULA 4 - VALOR E PAGAMENTO',
        `Valor mensal acordado: ${brl(data.valorFinal)}.`,
        '',
        'CLÁUSULA 5 - VIGÊNCIA',
        'Vigência inicial de 30 dias, renovável automaticamente.',
        '',
        'CLÁUSULA 6 - RESCISÃO',
        'Qualquer parte pode rescindir mediante aviso prévio de 7 dias.',
        '',
        'CLÁUSULA 7 - CONFIDENCIALIDADE (LGPD)',
        'As partes concordam com tratamento de dados pessoais conforme legislação vigente.',
        '',
        'CLÁUSULA 8 - FORO',
        'Fica eleito o foro da comarca da contratada para resolução de controvérsias.',
        '',
        'Assinaturas:',
        'Contratante: ____________________________',
        'Contratada: _____________________________',
    ];

    return {
        fileName: `Contrato_MaosAmigas_${data.orcamentoId}.pdf`,
        lines,
    };
}
