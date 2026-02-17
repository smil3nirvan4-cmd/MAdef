export interface PropostaData {
    orcamentoId: string;
    pacienteNome: string;
    pacienteTelefone: string;
    pacienteCidade?: string | null;
    pacienteBairro?: string | null;
    tipoCuidado?: string | null;
    valorFinal?: number | null;
    cenarioSelecionado?: string | null;
    observacoes?: string | null;
}

function brl(value?: number | null) {
    if (!value) return 'A combinar';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function todayBR() {
    return new Date().toLocaleDateString('pt-BR');
}

export function buildPropostaTemplate(data: PropostaData) {
    const validade = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
    const local = [data.pacienteCidade, data.pacienteBairro].filter(Boolean).join(' - ') || 'Não informado';

    const lines = [
        'MÃOS AMIGAS - PROPOSTA COMERCIAL DE HOME CARE',
        `Data: ${todayBR()}  |  Proposta: ${data.orcamentoId}`,
        '',
        '1. DADOS DO PACIENTE',
        `Nome: ${data.pacienteNome || 'Não informado'}`,
        `Telefone: ${data.pacienteTelefone || 'Não informado'}`,
        `Local: ${local}`,
        '',
        '2. ESCOPO DO SERVIÇO',
        `Tipo de cuidado: ${data.tipoCuidado || 'HOME_CARE'}`,
        `Cenário recomendado: ${data.cenarioSelecionado || 'Padrão'}`,
        '',
        '3. COMPOSIÇÃO DE VALORES',
        `Valor mensal estimado: ${brl(data.valorFinal)}`,
        'Forma de pagamento: boleto, PIX ou transferência.',
        '',
        '4. CONDIÇÕES GERAIS',
        `Validade desta proposta: até ${validade}.`,
        'Início do atendimento sujeito à confirmação cadastral e disponibilidade de profissional.',
        '',
        '5. OBSERVAÇÕES',
        data.observacoes || 'Sem observações adicionais.',
        '',
        'Mãos Amigas - Cuidado humanizado para quem você ama.',
    ];

    return {
        fileName: `Proposta_MaosAmigas_${data.orcamentoId}.pdf`,
        lines,
    };
}
