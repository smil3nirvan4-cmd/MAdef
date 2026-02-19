import { describe, expect, it } from 'vitest';
import { generateSchedule, type PlanningInput } from './recurrence-engine';

function createInput(overrides?: Partial<PlanningInput>): PlanningInput {
    return {
        recurrenceType: 'WEEKLY',
        startDate: '2026-02-02',
        endDate: '2026-03-01',
        daysOfWeek: [1, 3],
        shiftType: 'DIURNO',
        shiftStart: '07:00',
        shiftEnd: '19:00',
        hoursPerOccurrence: 12,
        quantityPatients: 1,
        ...overrides,
    };
}

describe('recurrence-engine', () => {
    it('gera 2x por semana por 4 semanas', () => {
        const schedule = generateSchedule(createInput());

        expect(schedule.totalDays).toBe(8);
        expect(schedule.totalHours).toBe(96);
        expect(schedule.windowStart).toBe('2026-02-02');
        expect(schedule.windowEnd).toBe('2026-03-01');
    });

    it('suporta recorrencia quinzenal', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'BIWEEKLY',
            interval: 2,
        }));

        expect(schedule.totalDays).toBe(4);
        expect(schedule.occurrences[0].date).toBe('2026-02-02');
        expect(schedule.occurrences[2].date).toBe('2026-02-16');
    });

    it('suporta monthly por dia do mes', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'MONTHLY',
            daysOfWeek: undefined,
            startDate: '2026-01-10',
            endDate: '2026-04-20',
        }));

        expect(schedule.totalDays).toBe(4);
        expect(schedule.occurrences.map((item) => item.date)).toEqual([
            '2026-01-10',
            '2026-02-10',
            '2026-03-10',
            '2026-04-10',
        ]);
    });

    it('suporta CUSTOM_DATES por customDates', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'CUSTOM_DATES',
            customDates: ['2026-02-05', '2026-02-14', '2026-02-20'],
            includedDates: [],
            endDate: '2026-02-28',
        }));

        expect(schedule.totalDays).toBe(4); // startDate + 3 datas
        expect(schedule.occurrences.some((item) => item.date === '2026-02-14')).toBe(true);
    });

    it('suporta PACKAGE com ocorrencias e intervalo', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'PACKAGE',
            occurrences: 5,
            interval: 2,
            daysOfWeek: [1, 3, 5],
            endDate: '2026-03-01',
        }));

        expect(schedule.totalDays).toBeGreaterThan(0);
        expect(schedule.totalDays).toBeLessThanOrEqual(5);
    });

    it('aplica inclusao manual de data', () => {
        const schedule = generateSchedule(createInput({
            includedDates: ['2026-02-07'],
        }));

        expect(schedule.occurrences.some((item) => item.date === '2026-02-07')).toBe(true);
    });

    it('aplica exclusao manual de data', () => {
        const schedule = generateSchedule(createInput({
            excludedDates: ['2026-02-04'],
        }));

        expect(schedule.totalDays).toBe(7);
        expect(schedule.occurrences.some((item) => item.date === '2026-02-04')).toBe(false);
    });

    it('marca feriado simples por string', () => {
        const schedule = generateSchedule(createInput({
            holidays: ['2026-02-04'],
        }));

        const holidayOccurrence = schedule.occurrences.find((item) => item.date === '2026-02-04');
        expect(holidayOccurrence?.isHoliday).toBe(true);
        expect(holidayOccurrence?.dayType).toBe('HOLIDAY');
    });

    it('marca feriado anual recorrente', () => {
        const schedule = generateSchedule(createInput({
            startDate: '2027-02-01',
            endDate: '2027-02-28',
            daysOfWeek: [4], // quinta
            holidays: [{ date: '2026-02-04', recurringAnnual: true, type: 'NATIONAL' }],
        }));

        const holidayOccurrence = schedule.occurrences.find((item) => item.date === '2027-02-04');
        expect(holidayOccurrence?.holidayType).toBe('NATIONAL');
    });

    it('classifica weekend', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-02-08', // domingo
        }));

        expect(schedule.occurrences[0].isWeekend).toBe(true);
        expect(schedule.occurrences[0].dayType).toBe('WEEKEND');
    });

    it('divide turno que cruza meia-noite em segmentos', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-02-18',
            shiftType: 'NOTURNO',
            shiftStart: '22:00',
            shiftEnd: '06:00',
        }));

        expect(schedule.totalDays).toBe(1);
        expect(schedule.totalOccurrences).toBe(2);
        expect(schedule.totalHours).toBe(8);
        expect(schedule.occurrences.every((item) => (item.tags || []).includes('CROSS_MIDNIGHT'))).toBe(true);
    });

    it('usa durationDays quando endDate nao informado', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-02-02',
            endDate: undefined,
            durationDays: 14,
            daysOfWeek: [1, 2, 3, 4, 5],
        }));

        expect(schedule.windowEnd).toBe('2026-02-15');
        expect(schedule.totalDays).toBeGreaterThan(0);
    });

    it('gera debug opcional', () => {
        const schedule = generateSchedule(createInput({
            debug: true,
            includedDates: ['2026-02-06'],
            excludedDates: ['2026-02-04'],
        }));

        expect(schedule.debug).toBeDefined();
        expect(schedule.debug?.includedDates).toContain('2026-02-06');
        expect(schedule.debug?.excludedDates).toContain('2026-02-04');
    });

    it('eh deterministico para mesma entrada', () => {
        const input = createInput({
            holidays: ['2026-02-04'],
            includedDates: ['2026-02-07'],
            excludedDates: ['2026-02-11'],
        });

        const first = generateSchedule(input);
        const second = generateSchedule(input);
        expect(second).toEqual(first);
    });

    it('falha quando endDate < startDate', () => {
        expect(() => generateSchedule(createInput({
            startDate: '2026-03-01',
            endDate: '2026-02-01',
        }))).toThrow(/endDate/);
    });

    it('falha com data invalida', () => {
        expect(() => generateSchedule(createInput({
            startDate: '2026-13-99',
        }))).toThrow(/startDate/);
    });
});
