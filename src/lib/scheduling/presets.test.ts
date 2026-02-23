import { describe, expect, it } from 'vitest';
import { PLANNING_PRESETS, type PlanningPreset } from './presets';
import { generateSchedule, type PlanningInput } from './recurrence-engine';

function presetToInput(preset: PlanningPreset, startDate: string): PlanningInput {
    return {
        ...preset.planning,
        startDate,
        quantityPatients: preset.planning.quantityPatients ?? 1,
    };
}

describe('planning presets', () => {
    it('exports a non-empty array of presets', () => {
        expect(PLANNING_PRESETS.length).toBeGreaterThan(0);
    });

    it('every preset has unique id', () => {
        const ids = PLANNING_PRESETS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('every preset has label and description', () => {
        for (const preset of PLANNING_PRESETS) {
            expect(preset.label.length).toBeGreaterThan(0);
            expect(preset.description.length).toBeGreaterThan(0);
        }
    });

    it('every preset has valid recurrenceType', () => {
        const validTypes = ['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM_DATES', 'PACKAGE'];
        for (const preset of PLANNING_PRESETS) {
            expect(validTypes).toContain(preset.planning.recurrenceType);
        }
    });

    it('every preset has valid shiftType', () => {
        const validShifts = ['DIURNO', 'NOTURNO', '24H', 'CUSTOM'];
        for (const preset of PLANNING_PRESETS) {
            expect(validShifts).toContain(preset.planning.shiftType);
        }
    });

    it('every preset has positive hoursPerOccurrence', () => {
        for (const preset of PLANNING_PRESETS) {
            expect(preset.planning.hoursPerOccurrence).toBeGreaterThan(0);
        }
    });

    it('every preset generates a valid schedule when given a start date', () => {
        for (const preset of PLANNING_PRESETS) {
            const input = presetToInput(preset, '2026-03-02');
            const schedule = generateSchedule(input);
            expect(schedule.totalHours).toBeGreaterThan(0);
            expect(schedule.totalDays).toBeGreaterThan(0);
        }
    });

    describe('specific presets', () => {
        it('2X_SEMANA_12H_4S generates 8 occurrences at 12h each', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === '2X_SEMANA_12H_4S')!;
            expect(preset).toBeDefined();

            const input = presetToInput(preset, '2026-03-02');
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(8);
            expect(schedule.totalHours).toBe(96);
        });

        it('SEG_QUA_SEX_12H generates 12 occurrences on Mon/Wed/Fri', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'SEG_QUA_SEX_12H')!;
            expect(preset).toBeDefined();

            const input = presetToInput(preset, '2026-03-02');
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(12);
            expect(schedule.totalHours).toBe(144);

            for (const occ of schedule.occurrences) {
                const day = new Date(occ.date + 'T00:00:00Z').getUTCDay();
                expect([1, 3, 5]).toContain(day);
            }
        });

        it('FDS_24H_RECORRENTE only generates Saturday and Sunday', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'FDS_24H_RECORRENTE')!;
            expect(preset).toBeDefined();

            const input = presetToInput(preset, '2026-03-07'); // Saturday
            const schedule = generateSchedule(input);

            for (const occ of schedule.occurrences) {
                const day = new Date(occ.date + 'T00:00:00Z').getUTCDay();
                expect([0, 6]).toContain(day);
            }
            expect(schedule.occurrences[0].hours).toBe(24);
        });

        it('VINTE_QUATRO_SETE_30D generates 30 days of 24h when all days allowed', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'VINTE_QUATRO_SETE_30D')!;
            expect(preset).toBeDefined();

            // PACKAGE preset has no daysOfWeek, so default is [startDate.getUTCDay()]
            // To get full 30 days we must supply all days of week
            const input: PlanningInput = {
                ...presetToInput(preset, '2026-03-01'),
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                endDate: '2026-04-30',
            };
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(30);
            expect(schedule.totalHours).toBe(720);
        });

        it('VINTE_QUATRO_SETE_30D without daysOfWeek uses startDate day only', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'VINTE_QUATRO_SETE_30D')!;
            const input = presetToInput(preset, '2026-03-02'); // Monday
            const schedule = generateSchedule(input);

            // Only Mondays picked, so fewer than 30 days
            expect(schedule.totalDays).toBeGreaterThan(0);
            expect(schedule.totalDays).toBeLessThanOrEqual(30);
            expect(schedule.totalHours).toBe(schedule.totalDays * 24);
        });

        it('NOTURNO_4_SEMANAS generates nightly shifts', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'NOTURNO_4_SEMANAS')!;
            expect(preset).toBeDefined();

            const input = presetToInput(preset, '2026-03-02');
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(28);
            // Each night shift crosses midnight, so 2 segments per day
            expect(schedule.totalOccurrences).toBe(56);
        });

        it('PACOTE_240H_MES generates 20 occurrences of 12h when all days allowed', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'PACOTE_240H_MES')!;
            expect(preset).toBeDefined();

            // PACKAGE preset has no daysOfWeek; supply all days to reach 20 occurrences
            const input: PlanningInput = {
                ...presetToInput(preset, '2026-03-02'),
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                endDate: '2026-04-30',
            };
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(20);
            expect(schedule.totalHours).toBe(240);
        });

        it('PACOTE_120H_MES generates 10 occurrences of 12h when all days allowed', () => {
            const preset = PLANNING_PRESETS.find((p) => p.id === 'PACOTE_120H_MES')!;
            expect(preset).toBeDefined();

            const input: PlanningInput = {
                ...presetToInput(preset, '2026-03-02'),
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                endDate: '2026-04-30',
            };
            const schedule = generateSchedule(input);

            expect(schedule.totalDays).toBe(10);
            expect(schedule.totalHours).toBe(120);
        });
    });
});
