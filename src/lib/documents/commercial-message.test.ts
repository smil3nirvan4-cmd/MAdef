import { describe, expect, it } from 'vitest';
import { renderCommercialMessage } from './commercial-message';
import type { OrcamentoPDFData } from './pdf-generator';

function buildPdfFixture(): OrcamentoPDFData {
    return {
        referencia: '20260219-ABC',
        dataEmissao: '19/02/2026',
        validadeDias: 15,
        pacienteNome: 'Paciente Teste',
        numeroPacientes: 1,
        condicaoClinica: 'MEDIA',
        profissionalMinimo: 'Cuidador(a)',
        tipo: 'PROPOSTA',
        configuracaoComercial: {
            valorPeriodo: 409.11,
            dataVencimento: '19/02/2026',
            descontoPercentual: 0,
            descontoValor: 0,
            acrescimosValor: 0,
            metodosPagamento: ['PIX', 'CARTAO DE CREDITO'],
            opcoesParcelamento: ['1x sem juros', '2x sem juros', '3x sem juros', '4x sem juros'],
            entrada: 0,
            parcelas: 1,
            valorParcela: 409.11,
            valorLiquido: 409.11,
        },
        cenario: {
            nome: 'Recomendado',
            totalSemanal: 409.11,
            estimativaMensal: 1771.45,
            plantoes: [],
            parametros: {
                r0: 180,
                a2p: 50,
                an: 20,
                afds: 20,
                metodoPagamento: 'Pix',
                periodo: 'Semanal',
            },
            descontos: [],
        },
    };
}

describe('commercial-message', () => {
    it('renderiza template padrao com dados comerciais', () => {
        const message = renderCommercialMessage({
            tipo: 'PROPOSTA',
            pacienteNome: 'Smile Nirvana',
            pdfData: buildPdfFixture(),
            avaliacao: {
                dadosDetalhados: JSON.stringify({
                    discovery: { gatilho: 'Piora cognitiva' },
                    clinical: { quedas: 'Queda < 1 mes', medicamentos: { total: '1-3' } },
                    abemid: { observacoes: 'Sem observacoes' },
                }),
            },
            orcamento: {},
            sendOptions: {
                dataVencimento: '2026-02-19',
                descontoManualPercent: 5,
                descontoValor: 10,
                acrescimosValor: 3,
                parcelas: 2,
                entrada: 122.73,
            },
        });

        expect(message.rendered).toContain('Proposta Comercial Maos Amigas');
        expect(message.rendered).toContain('Smile Nirvana');
        expect(message.rendered).toContain('Piora cognitiva');
        expect(message.rendered).toContain('Data vencimento: 19/02/2026');
        expect(message.rendered).toContain('Metodos de pagamento: PIX, CARTAO DE CREDITO');
        expect(message.rendered).toContain('Forma de pagamento: 1x sem juros, 2x sem juros, 3x sem juros, 4x sem juros');
    });

    it('permite template customizado e reporta variavel ausente', () => {
        const message = renderCommercialMessage({
            tipo: 'CONTRATO',
            pacienteNome: 'Paciente',
            pdfData: buildPdfFixture(),
            avaliacao: null,
            orcamento: {},
            sendOptions: {
                mensagemTemplate: 'Ola {{nome}} {{variavel_inexistente}}',
            },
        });

        expect(message.rendered).toContain('Ola Paciente');
        expect(message.missingVariables).toEqual(['variavel_inexistente']);
    });
});
