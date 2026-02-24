import { describe, it, expect } from 'vitest';
import { defaultContractTemplate, buildContractRenderData } from '../render-data';

describe('defaultContractTemplate', () => {
    it('returns non-empty string with placeholders', () => {
        const tmpl = defaultContractTemplate();
        expect(tmpl).toContain('<<orcamento.id>>');
        expect(tmpl).toContain('<<paciente.nome>>');
        expect(tmpl).toContain('<<preco.total>>');
    });
});

describe('buildContractRenderData', () => {
    const baseOrcamento = {
        id: 'orc-123',
        valorFinal: 5000,
        normalizedSchedule: null,
        pricingBreakdown: null,
    };

    it('returns basic structure with defaults', () => {
        const data = buildContractRenderData(baseOrcamento);
        expect(data.orcamento).toEqual({ id: 'orc-123' });
        expect((data.preco as any).total).toBe('5000.00');
        expect((data.contrato as any).tipo).toBe('MENSAL');
        expect((data.pagamento as any).metodo).toBe('PIX');
    });

    it('uses paciente name when provided', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            paciente: { nome: 'Ana', telefone: '5511988880001' },
        });
        expect((data.paciente as any).nome).toBe('Ana');
    });

    it('uses unidade when provided', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            unidade: { nome: 'Filial SP', codigo: 'SP01' },
        });
        expect((data.unidade as any).nome).toBe('Filial SP');
        expect((data.unidade as any).codigo).toBe('SP01');
    });

    it('defaults unidade when not provided', () => {
        const data = buildContractRenderData(baseOrcamento);
        expect((data.unidade as any).nome).toBe('Unidade padrao');
        expect((data.unidade as any).codigo).toBe('MATRIZ');
    });

    it('parses normalizedSchedule JSON', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            normalizedSchedule: JSON.stringify({
                totalHours: 40,
                totalDaysActive: 5,
                totalOccurrences: 10,
                windowStart: '2025-01-01',
                windowEnd: '2025-01-31',
            }),
        });
        expect((data.escala as any).resumo).toContain('10 ocorrencia(s)');
        expect((data.escala as any).resumo).toContain('5 dia(s) ativo(s)');
        expect((data.escala as any).resumo).toContain('40h');
        expect((data.datas as any).inicio).toBe('2025-01-01');
        expect((data.datas as any).fim).toBe('2025-01-31');
    });

    it('parses pricingBreakdown JSON', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            valorFinal: null,
            pricingBreakdown: JSON.stringify({
                finalPrice: 3000,
                costProfessional: 2000,
            }),
        });
        expect((data.preco as any).total).toBe('3000.00');
        expect((data.preco as any).prestador).toBe('2000.00');
        expect((data.preco as any).taxa_maos_amigas).toBe('1000.00');
    });

    it('uses options when provided', () => {
        const data = buildContractRenderData(baseOrcamento, {
            contractType: 'AVULSO',
            paymentMethod: 'BOLETO',
            dueDate: '2025-02-15',
            cancellationPolicy: 'Sem reembolso.',
        });
        expect((data.contrato as any).tipo).toBe('AVULSO');
        expect((data.pagamento as any).metodo).toBe('BOLETO');
        expect((data.pagamento as any).vencimento).toBe('2025-02-15');
        expect((data.politica as any).cancelamento).toBe('Sem reembolso.');
    });

    it('handles invalid JSON gracefully', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            normalizedSchedule: 'not-json',
            pricingBreakdown: '{bad',
        });
        expect((data.preco as any).total).toBe('5000.00');
        expect((data.escala as any).resumo).toContain('0 ocorrencia(s)');
    });

    it('uses breakdown fallback when top-level pricing missing', () => {
        const data = buildContractRenderData({
            ...baseOrcamento,
            valorFinal: null,
            pricingBreakdown: JSON.stringify({
                breakdown: {
                    final_cliente: 4500,
                    custo_profissional: 3200,
                },
            }),
        });
        expect((data.preco as any).total).toBe('4500.00');
        expect((data.preco as any).prestador).toBe('3200.00');
        expect((data.preco as any).taxa_maos_amigas).toBe('1300.00');
    });
});
