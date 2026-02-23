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

describe('recurrence-engine edge cases', () => {
    // --- empty / minimal inputs ---

    it('NONE com um unico dia gera exatamente 1 ocorrencia', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: undefined,
        }));

        expect(schedule.totalDays).toBe(1);
        expect(schedule.totalOccurrences).toBe(1);
        expect(schedule.occurrences[0].date).toBe('2026-06-15');
    });

    it('WEEKLY sem daysOfWeek usa dia da semana do startDate', () => {
        // 2026-06-15 is a Monday (day 1)
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-07-13',
            daysOfWeek: undefined,
        }));

        for (const occ of schedule.occurrences) {
            const date = new Date(occ.date + 'T00:00:00Z');
            expect(date.getUTCDay()).toBe(1); // all Mondays
        }
    });

    it('daysOfWeek com duplicatas e valores invalidos sao filtrados', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-07-13',
            daysOfWeek: [1, 1, 1, -1, 7, 99, 3],
        }));

        const days = new Set(schedule.occurrences.map((o) => {
            return new Date(o.date + 'T00:00:00Z').getUTCDay();
        }));
        // Only valid days 1 and 3 should remain
        expect(days.has(1)).toBe(true);
        expect(days.has(3)).toBe(true);
        expect(days.has(7)).toBe(false);
    });

    it('startDate igual a endDate gera no maximo 1 dia', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-15',
            daysOfWeek: [1], // Monday = 2026-06-15
        }));

        expect(schedule.totalDays).toBe(1);
    });

    it('startDate igual a endDate mas dia nao bate gera 0 ocorrencias', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15', // Monday
            endDate: '2026-06-15',
            daysOfWeek: [5], // Friday - not in window
        }));

        expect(schedule.totalDays).toBe(0);
        expect(schedule.totalHours).toBe(0);
    });

    // --- date boundary handling ---

    it('year-end wrapping: schedule spans Dec to Jan', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-12-28',
            endDate: '2027-01-11',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // every day
        }));

        expect(schedule.windowStart).toBe('2026-12-28');
        expect(schedule.windowEnd).toBe('2027-01-11');
        const dates = schedule.occurrences.map((o) => o.date);
        expect(dates).toContain('2026-12-31');
        expect(dates).toContain('2027-01-01');
    });

    it('February 28/29 boundary in non-leap year', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-02-23',
            endDate: '2026-03-06',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }));

        const dates = schedule.occurrences.map((o) => o.date);
        expect(dates).toContain('2026-02-28');
        expect(dates).not.toContain('2026-02-29'); // 2026 is not a leap year
        expect(dates).toContain('2026-03-01');
    });

    it('February 29 in leap year is handled', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2028-02-27',
            endDate: '2028-03-02',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }));

        const dates = schedule.occurrences.map((o) => o.date);
        expect(dates).toContain('2028-02-29');
    });

    // --- excluded / included interactions ---

    it('exclude all generated dates results in empty schedule', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: '2026-06-15',
            excludedDates: ['2026-06-15'],
        }));

        expect(schedule.totalDays).toBe(0);
        expect(schedule.totalHours).toBe(0);
        expect(schedule.occurrences).toHaveLength(0);
    });

    it('includedDates outside window are ignored', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: '2026-06-15',
            includedDates: ['2027-01-01'],
        }));

        const dates = schedule.occurrences.map((o) => o.date);
        expect(dates).not.toContain('2027-01-01');
    });

    it('includedDates within window are added', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-30',
            daysOfWeek: [1], // Mondays only
            includedDates: ['2026-06-18'], // Thursday, within window
        }));

        const dates = schedule.occurrences.map((o) => o.date);
        expect(dates).toContain('2026-06-18');
    });

    it('excludedDates that are not generated have no effect', () => {
        const scheduleWithout = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-30',
            daysOfWeek: [1],
        }));

        const scheduleWith = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-30',
            daysOfWeek: [1],
            excludedDates: ['2026-06-18'], // Thursday, not generated anyway
        }));

        expect(scheduleWith.totalDays).toBe(scheduleWithout.totalDays);
    });

    // --- shift types ---

    it('24H shift produces 24 hours per occurrence', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: undefined,
            shiftType: '24H',
            hoursPerOccurrence: 24,
        }));

        expect(schedule.totalHours).toBe(24);
        expect(schedule.occurrences[0].hours).toBe(24);
    });

    it('NOTURNO with default times produces 12 hours', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: undefined,
            shiftType: 'NOTURNO',
            shiftStart: undefined,
            shiftEnd: undefined,
            hoursPerOccurrence: 12,
        }));

        expect(schedule.totalHours).toBe(12);
    });

    it('DIURNO with default times produces 12 hours', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: undefined,
            shiftType: 'DIURNO',
            shiftStart: undefined,
            shiftEnd: undefined,
            hoursPerOccurrence: 12,
        }));

        expect(schedule.totalHours).toBe(12);
    });

    it('CUSTOM shift with valid times calculates hours from times', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'NONE',
            startDate: '2026-06-15',
            endDate: undefined,
            shiftType: 'CUSTOM',
            shiftStart: '08:00',
            shiftEnd: '14:00',
            hoursPerOccurrence: 6,
        }));

        expect(schedule.totalHours).toBe(6);
    });

    it('cross-midnight shift tags all segments with CROSS_MIDNIGHT', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-22',
            daysOfWeek: [1], // Monday
            shiftType: 'NOTURNO',
            shiftStart: '23:00',
            shiftEnd: '05:00',
            hoursPerOccurrence: 6,
        }));

        const segments = schedule.occurrences.filter((o) =>
            (o.tags || []).includes('CROSS_MIDNIGHT'));
        expect(segments.length).toBeGreaterThan(0);
        expect(segments.every((s) => (s.tags || []).includes('CROSS_MIDNIGHT'))).toBe(true);
    });

    // --- MONTHLY recurrence ---

    it('MONTHLY repeats on same day of month', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'MONTHLY',
            startDate: '2026-01-15',
            endDate: '2026-06-15',
            daysOfWeek: undefined,
        }));

        for (const occ of schedule.occurrences) {
            expect(occ.date.endsWith('-15')).toBe(true);
        }
        expect(schedule.totalDays).toBe(6);
    });

    it('MONTHLY with interval 2 skips months', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'MONTHLY',
            startDate: '2026-01-10',
            endDate: '2026-12-31',
            daysOfWeek: undefined,
            interval: 2,
        }));

        const months = schedule.occurrences.map((o) => parseInt(o.date.split('-')[1], 10));
        // Should be Jan, Mar, May, Jul, Sep, Nov
        expect(months).toEqual([1, 3, 5, 7, 9, 11]);
    });

    // --- PACKAGE recurrence ---

    it('PACKAGE with occurrences=1 produces exactly one day', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'PACKAGE',
            startDate: '2026-06-15',
            occurrences: 1,
            interval: 1,
            endDate: '2026-07-15',
        }));

        expect(schedule.totalDays).toBe(1);
    });

    it('PACKAGE respects allowed daysOfWeek', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'PACKAGE',
            startDate: '2026-06-15', // Monday
            occurrences: 5,
            interval: 1,
            daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
            endDate: '2026-07-15',
        }));

        for (const occ of schedule.occurrences) {
            const day = new Date(occ.date + 'T00:00:00Z').getUTCDay();
            expect([1, 3, 5]).toContain(day);
        }
    });

    // --- CUSTOM_DATES ---

    it('CUSTOM_DATES with empty customDates still includes startDate', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'CUSTOM_DATES',
            startDate: '2026-06-15',
            customDates: [],
            endDate: '2026-06-30',
        }));

        expect(schedule.occurrences.map((o) => o.date)).toContain('2026-06-15');
    });

    // --- occurrences truncation ---

    it('forces expected occurrences when occurrences is set', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: undefined,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            occurrences: 3,
        }));

        expect(schedule.totalDays).toBe(3);
    });

    // --- holidays ---

    it('multiple holidays of different types', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-30',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            holidays: [
                { date: '2026-06-20', type: 'NATIONAL', name: 'Feriado Nacional' },
                { date: '2026-06-25', type: 'CUSTOM', name: 'Feriado Local' },
            ],
        }));

        const national = schedule.occurrences.find((o) => o.date === '2026-06-20');
        const custom = schedule.occurrences.find((o) => o.date === '2026-06-25');

        expect(national?.isHoliday).toBe(true);
        expect(national?.holidayType).toBe('NATIONAL');
        expect(national?.dayType).toBe('HOLIDAY');

        expect(custom?.isHoliday).toBe(true);
        expect(custom?.holidayType).toBe('CUSTOM');
    });

    it('weekend classification is correct for Saturday and Sunday', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-21',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }));

        for (const occ of schedule.occurrences) {
            const day = new Date(occ.date + 'T00:00:00Z').getUTCDay();
            if (day === 0 || day === 6) {
                expect(occ.isWeekend).toBe(true);
                expect(occ.dayType).toBe('WEEKEND');
            } else {
                expect(occ.isWeekend).toBe(false);
                expect(occ.dayType).toBe('WEEKDAY');
            }
        }
    });

    it('holiday on weekend is classified as HOLIDAY not WEEKEND', () => {
        // 2026-06-20 is Saturday
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-06-21',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            holidays: ['2026-06-20'],
        }));

        const saturday = schedule.occurrences.find((o) => o.date === '2026-06-20');
        expect(saturday?.isHoliday).toBe(true);
        expect(saturday?.isWeekend).toBe(true);
        expect(saturday?.dayType).toBe('HOLIDAY'); // holiday takes precedence
    });

    // --- validation errors ---

    it('falha com formato de hora invalido', () => {
        expect(() => generateSchedule(createInput({
            shiftType: 'CUSTOM',
            shiftStart: '25:00',
            shiftEnd: '30:00',
        }))).toThrow(/shiftStart/);
    });

    it('falha com startDate vazio', () => {
        expect(() => generateSchedule(createInput({
            startDate: '',
        }))).toThrow(/startDate/);
    });

    // --- durationDays ---

    it('durationDays=1 gera window de um unico dia', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: undefined,
            durationDays: 1,
            daysOfWeek: [1],
        }));

        expect(schedule.windowStart).toBe('2026-06-15');
        expect(schedule.windowEnd).toBe('2026-06-15');
    });

    // --- debug mode ---

    it('debug mode excludedDates lists excluded dates', () => {
        const schedule = generateSchedule(createInput({
            debug: true,
            excludedDates: ['2026-02-04'],
        }));

        expect(schedule.debug).toBeDefined();
        expect(schedule.debug?.excludedDates).toContain('2026-02-04');
        // The excluded date should not be in generated dates
        expect(schedule.debug?.generatedDates).not.toContain('2026-02-04');
    });

    // --- occurrences are sorted ---

    it('occurrences are sorted chronologically', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'WEEKLY',
            startDate: '2026-06-15',
            endDate: '2026-07-15',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        }));

        for (let i = 1; i < schedule.occurrences.length; i++) {
            const prev = schedule.occurrences[i - 1].startAt || '';
            const curr = schedule.occurrences[i].startAt || '';
            expect(curr >= prev).toBe(true);
        }
    });

    // --- BIWEEKLY specifics ---

    it('BIWEEKLY skips alternate weeks', () => {
        const schedule = generateSchedule(createInput({
            recurrenceType: 'BIWEEKLY',
            startDate: '2026-06-01',
            endDate: '2026-06-28',
            daysOfWeek: [1], // Mondays
        }));

        const dates = schedule.occurrences.map((o) => o.date);
        // Week 0 (June 1) and week 2 (June 15) should match, weeks 1 and 3 skipped
        expect(dates).toContain('2026-06-01');
        expect(dates).toContain('2026-06-15');
        expect(dates).not.toContain('2026-06-08');
        expect(dates).not.toContain('2026-06-22');
    });
});
