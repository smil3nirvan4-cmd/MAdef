import { describe, it, expect } from 'vitest';
import { PLANNING_PRESETS, type PlanningPreset } from './presets';

describe('PLANNING_PRESETS', () => {
    it('has at least 5 presets', () => {
        expect(PLANNING_PRESETS.length).toBeGreaterThanOrEqual(5);
    });

    it('each preset has a unique id', () => {
        const ids = PLANNING_PRESETS.map(p => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('each preset has label and description', () => {
        for (const preset of PLANNING_PRESETS) {
            expect(preset.label).toBeTruthy();
            expect(preset.description).toBeTruthy();
        }
    });

    it('each preset has a valid recurrenceType', () => {
        for (const preset of PLANNING_PRESETS) {
            expect(['WEEKLY', 'PACKAGE']).toContain(preset.planning.recurrenceType);
        }
    });

    it('each preset has occurrences > 0', () => {
        for (const preset of PLANNING_PRESETS) {
            expect(preset.planning.occurrences).toBeGreaterThan(0);
        }
    });

    it('each preset has hoursPerOccurrence of 12 or 24', () => {
        for (const preset of PLANNING_PRESETS) {
            expect([12, 24]).toContain(preset.planning.hoursPerOccurrence);
        }
    });

    it('WEEKLY presets have daysOfWeek defined', () => {
        const weeklyPresets = PLANNING_PRESETS.filter(p => p.planning.recurrenceType === 'WEEKLY');
        for (const preset of weeklyPresets) {
            expect(preset.planning.daysOfWeek).toBeDefined();
            expect(preset.planning.daysOfWeek!.length).toBeGreaterThan(0);
        }
    });

    it('PACKAGE presets do not require daysOfWeek', () => {
        const packagePresets = PLANNING_PRESETS.filter(p => p.planning.recurrenceType === 'PACKAGE');
        expect(packagePresets.length).toBeGreaterThan(0);
    });

    it('24x7 preset has correct values', () => {
        const p = PLANNING_PRESETS.find(p => p.id === 'VINTE_QUATRO_SETE_30D');
        expect(p).toBeDefined();
        expect(p!.planning.occurrences).toBe(30);
        expect(p!.planning.hoursPerOccurrence).toBe(24);
        expect(p!.planning.shiftType).toBe('24H');
    });

    it('noturno preset has shiftStart and shiftEnd', () => {
        const p = PLANNING_PRESETS.find(p => p.id === 'NOTURNO_4_SEMANAS');
        expect(p).toBeDefined();
        expect(p!.planning.shiftType).toBe('NOTURNO');
        expect(p!.planning.shiftStart).toBe('19:00');
        expect(p!.planning.shiftEnd).toBe('07:00');
    });

    it('FDS preset covers Saturday and Sunday', () => {
        const p = PLANNING_PRESETS.find(p => p.id === 'FDS_24H_RECORRENTE');
        expect(p).toBeDefined();
        expect(p!.planning.daysOfWeek).toEqual([0, 6]);
    });
});
