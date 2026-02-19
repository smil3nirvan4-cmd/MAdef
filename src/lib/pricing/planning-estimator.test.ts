import { describe, expect, it } from 'vitest';
import { estimatePlanning, normalizeWeekdayTokens } from './planning-estimator';

describe('planning-estimator', () => {
    it('normaliza dias da semana com aliases', () => {
        expect(normalizeWeekdayTokens(['seg', 'quarta', '6', 'sabado', 'seg'])).toEqual([1, 3, 6]);
    });

    it('calcula 1 dia com 24h quando inicio e fim sao iguais', () => {
        const result = estimatePlanning({
            dataInicioCuidado: '2026-02-18',
            dataFimCuidado: '2026-02-18',
            periodicidade: 'DIARIO',
            horasCuidadoDia: 24,
            diasAtendimento: ['qua'],
        });

        expect(result.diasCorridos).toBe(1);
        expect(result.diasAtivos).toBe(1);
        expect(result.horasTotais).toBe(24);
        expect(result.inicioISO).toBe('2026-02-18');
        expect(result.fimISO).toBe('2026-02-18');
    });

    it('calcula dias intercalados para escala semanal', () => {
        const result = estimatePlanning({
            dataInicioCuidado: '2026-02-16', // segunda
            dataFimCuidado: '2026-03-15',
            periodicidade: 'SEMANAL',
            horasCuidadoDia: 12,
            diasAtendimento: ['seg', 'qua', 'sex'],
        });

        expect(result.diasCorridos).toBe(28);
        expect(result.diasAtivos).toBe(12);
        expect(result.horasTotais).toBe(144);
    });

    it('reduz ocorrencias em recorrencia quinzenal', () => {
        const result = estimatePlanning({
            dataInicioCuidado: '2026-02-16', // segunda
            dataFimCuidado: '2026-03-15',
            periodicidade: 'QUINZENAL',
            horasCuidadoDia: 10,
            diasAtendimento: ['seg', 'qua'],
        });

        expect(result.diasAtivos).toBe(4);
        expect(result.horasTotais).toBe(40);
    });
});
