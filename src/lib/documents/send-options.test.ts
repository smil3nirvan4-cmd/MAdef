import { describe, expect, it } from 'vitest';
import { parseOrcamentoSendOptions, parseOrcamentoSendOptionsSafe } from './send-options';

describe('send-options', () => {
    it('normaliza campos validos e minicustos em string', () => {
        const parsed = parseOrcamentoSendOptions({
            cenarioSelecionado: 'premium',
            descontoManualPercent: '5',
            descontoValor: '30',
            acrescimosValor: '10',
            valorPeriodo: '409.11',
            dataVencimento: '2026-02-19',
            metodosPagamento: 'PIX,CARTAO_CREDITO',
            opcoesParcelamento: ['1x sem juros', '2x sem juros'],
            parcelas: '2',
            entrada: '122.73',
            valorParcela: '143.19',
            validadeHoras: '24',
            mensagemTemplate: 'Ola {{nome}}',
            valorFinal: '3909.67',
            minicustosDesativados: 'RESERVA_TECNICA, VISITA_SUPERVISAO',
        });

        expect(parsed).toEqual({
            cenarioSelecionado: 'premium',
            descontoManualPercent: 5,
            descontoValor: 30,
            acrescimosValor: 10,
            valorPeriodo: 409.11,
            dataVencimento: '2026-02-19',
            metodosPagamento: ['PIX', 'CARTAO_CREDITO'],
            opcoesParcelamento: ['1x sem juros', '2x sem juros'],
            parcelas: 2,
            entrada: 122.73,
            valorParcela: 143.19,
            validadeHoras: 24,
            mensagemTemplate: 'Ola {{nome}}',
            valorFinal: 3909.67,
            minicustosDesativados: ['RESERVA_TECNICA', 'VISITA_SUPERVISAO'],
        });
    });

    it('falha quando desconto manual esta fora de faixa', () => {
        expect(() => parseOrcamentoSendOptions({
            descontoManualPercent: '101',
        })).toThrow('Opcoes de envio invalidas');
    });

    it('safe parser retorna undefined em payload invalido', () => {
        const parsed = parseOrcamentoSendOptionsSafe({
            descontoManualPercent: 'abc',
        });
        expect(parsed).toBeUndefined();
    });
});
