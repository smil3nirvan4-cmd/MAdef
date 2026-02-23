import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildContractRenderData, defaultContractTemplate } from './render-data';
import { renderContract } from './template-engine';

describe('defaultContractTemplate', () => {
    it('returns a non-empty string', () => {
        const template = defaultContractTemplate();
        expect(template.length).toBeGreaterThan(0);
    });

    it('contains all required placeholders', () => {
        const template = defaultContractTemplate();
        expect(template).toContain('<<orcamento.id>>');
        expect(template).toContain('<<paciente.nome>>');
        expect(template).toContain('<<unidade.nome>>');
        expect(template).toContain('<<contrato.tipo>>');
        expect(template).toContain('<<preco.total>>');
        expect(template).toContain('<<preco.prestador>>');
        expect(template).toContain('<<preco.taxa_maos_amigas>>');
        expect(template).toContain('<<escala.resumo>>');
        expect(template).toContain('<<datas.inicio>>');
        expect(template).toContain('<<datas.fim>>');
        expect(template).toContain('<<pagamento.metodo>>');
        expect(template).toContain('<<pagamento.vencimento>>');
    });

    it('contains cancelamento placeholder', () => {
        const template = defaultContractTemplate();
        expect(template).toContain('<<politica.cancelamento>>');
    });
});

describe('buildContractRenderData', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function createMinimalOrcamento() {
        return {
            id: 'ORC-001',
            valorFinal: null as number | null,
            normalizedSchedule: null as string | null,
            pricingBreakdown: null as string | null,
            paciente: null as { nome: string | null; telefone: string | null } | null,
            unidade: null as { nome: string; codigo: string } | null,
        };
    }

    it('builds data from minimal orcamento with all nulls', () => {
        const data = buildContractRenderData(createMinimalOrcamento());

        expect(data.orcamento).toEqual({ id: 'ORC-001' });
        expect(data.paciente).toEqual({ nome: '', telefone: '' });
        expect(data.unidade).toEqual({ nome: 'Unidade padrao', codigo: 'MATRIZ' });
        expect(data.contrato).toEqual({ tipo: 'MENSAL' });
        expect(data.pagamento).toEqual(expect.objectContaining({ metodo: 'PIX' }));
        expect(data.preco).toEqual({ prestador: '0.00', taxa_maos_amigas: '0.00', total: '0.00' });
    });

    it('uses valorFinal from orcamento when available', () => {
        const orc = createMinimalOrcamento();
        orc.valorFinal = 1500.50;

        const data = buildContractRenderData(orc);

        expect((data.preco as Record<string, string>).total).toBe('1500.50');
    });

    it('falls back to pricing breakdown finalPrice when valorFinal is null', () => {
        const orc = createMinimalOrcamento();
        orc.pricingBreakdown = JSON.stringify({
            finalPrice: 2000,
            costProfessional: 1200,
        });

        const data = buildContractRenderData(orc);

        expect((data.preco as Record<string, string>).total).toBe('2000.00');
        expect((data.preco as Record<string, string>).prestador).toBe('1200.00');
        expect((data.preco as Record<string, string>).taxa_maos_amigas).toBe('800.00');
    });

    it('falls back to breakdown.final_cliente when other fields missing', () => {
        const orc = createMinimalOrcamento();
        orc.pricingBreakdown = JSON.stringify({
            breakdown: {
                final_cliente: 3000,
                custo_profissional: 1800,
            },
        });

        const data = buildContractRenderData(orc);

        expect((data.preco as Record<string, string>).total).toBe('3000.00');
        expect((data.preco as Record<string, string>).prestador).toBe('1800.00');
        expect((data.preco as Record<string, string>).taxa_maos_amigas).toBe('1200.00');
    });

    it('extracts schedule information correctly', () => {
        const orc = createMinimalOrcamento();
        orc.normalizedSchedule = JSON.stringify({
            totalHours: 120,
            totalDays: 10,
            totalDaysActive: 10,
            totalOccurrences: 20,
            windowStart: '2026-03-01',
            windowEnd: '2026-03-31',
        });

        const data = buildContractRenderData(orc);

        expect((data.escala as Record<string, string>).resumo).toContain('20 ocorrencia(s)');
        expect((data.escala as Record<string, string>).resumo).toContain('10 dia(s)');
        expect((data.escala as Record<string, string>).resumo).toContain('120h');
        expect((data.datas as Record<string, string>).inicio).toBe('2026-03-01');
        expect((data.datas as Record<string, string>).fim).toBe('2026-03-31');
    });

    it('uses paciente data when provided', () => {
        const orc = createMinimalOrcamento();
        orc.paciente = { nome: 'Joao Silva', telefone: '11999990000' };

        const data = buildContractRenderData(orc);

        expect((data.paciente as Record<string, string>).nome).toBe('Joao Silva');
        expect((data.paciente as Record<string, string>).telefone).toBe('11999990000');
    });

    it('uses unidade data when provided', () => {
        const orc = createMinimalOrcamento();
        orc.unidade = { nome: 'Filial Norte', codigo: 'NORTE' };

        const data = buildContractRenderData(orc);

        expect((data.unidade as Record<string, string>).nome).toBe('Filial Norte');
        expect((data.unidade as Record<string, string>).codigo).toBe('NORTE');
    });

    it('applies custom options', () => {
        const orc = createMinimalOrcamento();
        const data = buildContractRenderData(orc, {
            contractType: 'AVULSO',
            paymentMethod: 'BOLETO',
            dueDate: '2026-04-15',
            cancellationPolicy: 'Sem custos.',
        });

        expect((data.contrato as Record<string, string>).tipo).toBe('AVULSO');
        expect((data.pagamento as Record<string, string>).metodo).toBe('BOLETO');
        expect((data.pagamento as Record<string, string>).vencimento).toBe('2026-04-15');
        expect((data.politica as Record<string, string>).cancelamento).toBe('Sem custos.');
    });

    it('handles invalid JSON in normalizedSchedule gracefully', () => {
        const orc = createMinimalOrcamento();
        orc.normalizedSchedule = 'not valid json{';

        const data = buildContractRenderData(orc);

        expect((data.escala as Record<string, string>).resumo).toContain('0 ocorrencia(s)');
    });

    it('handles invalid JSON in pricingBreakdown gracefully', () => {
        const orc = createMinimalOrcamento();
        orc.pricingBreakdown = '{broken';

        const data = buildContractRenderData(orc);

        expect((data.preco as Record<string, string>).total).toBe('0.00');
    });

    it('taxa_maos_amigas is never negative', () => {
        const orc = createMinimalOrcamento();
        orc.valorFinal = 100;
        orc.pricingBreakdown = JSON.stringify({
            costProfessional: 200, // higher than total
        });

        const data = buildContractRenderData(orc);

        const taxa = parseFloat((data.preco as Record<string, string>).taxa_maos_amigas);
        expect(taxa).toBeGreaterThanOrEqual(0);
    });

    it('renders fully with default template producing no pending', () => {
        const orc = createMinimalOrcamento();
        orc.valorFinal = 5000;
        orc.normalizedSchedule = JSON.stringify({
            totalHours: 240,
            totalDaysActive: 20,
            totalOccurrences: 20,
            windowStart: '2026-03-01',
            windowEnd: '2026-03-31',
        });
        orc.pricingBreakdown = JSON.stringify({
            costProfessional: 3500,
        });
        orc.paciente = { nome: 'Ana Costa', telefone: '11988887777' };
        orc.unidade = { nome: 'Sede', codigo: 'SEDE' };

        const template = defaultContractTemplate();
        const data = buildContractRenderData(orc);
        const result = renderContract(template, data);

        expect(result.pending).toEqual([]);
        expect(result.content).toContain('Ana Costa');
        expect(result.content).toContain('5000.00');
        expect(result.content).toContain('Sede');
    });

    it('schedule with totalDays but no totalDaysActive falls back', () => {
        const orc = createMinimalOrcamento();
        orc.normalizedSchedule = JSON.stringify({
            totalHours: 60,
            totalDays: 5,
            totalOccurrences: 10,
            windowStart: '2026-04-01',
            windowEnd: '2026-04-30',
        });

        const data = buildContractRenderData(orc);

        expect((data.escala as Record<string, string>).resumo).toContain('5 dia(s)');
    });

    it('schedule with no totalOccurrences falls back to totalDays', () => {
        const orc = createMinimalOrcamento();
        orc.normalizedSchedule = JSON.stringify({
            totalHours: 60,
            totalDaysActive: 5,
            windowStart: '2026-04-01',
            windowEnd: '2026-04-30',
        });

        const data = buildContractRenderData(orc);

        expect((data.escala as Record<string, string>).resumo).toContain('5 ocorrencia(s)');
    });
});
