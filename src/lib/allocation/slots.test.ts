import { describe, it, expect } from 'vitest';
import { gerarSlots24h, type Slot } from './slots';

describe('gerarSlots24h', () => {
    const baseDate = new Date('2026-03-01T00:00:00Z');

    it('generates exactly 8 slots', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        expect(slots).toHaveLength(8);
    });

    it('assigns IDs from C1 to C8', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        const ids = slots.map(s => s.id);
        expect(ids).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']);
    });

    it('assigns correct equipeId to all slots', () => {
        const slots = gerarSlots24h('equipe-abc', baseDate, 30);
        expect(slots.every(s => s.equipeId === 'equipe-abc')).toBe(true);
    });

    it('C1-C4 are MANHA (diurno), C5-C8 are NOITE', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        const manhaSots = slots.filter(s => s.turno === 'MANHA');
        const noiteSlots = slots.filter(s => s.turno === 'NOITE');

        expect(manhaSots.map(s => s.id)).toEqual(['C1', 'C2', 'C3', 'C4']);
        expect(noiteSlots.map(s => s.id)).toEqual(['C5', 'C6', 'C7', 'C8']);
    });

    it('all slots start as DISPONIVEL', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        expect(slots.every(s => s.status === 'DISPONIVEL')).toBe(true);
    });

    it('no slot has a cuidadorId assigned', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        expect(slots.every(s => s.cuidadorId === undefined)).toBe(true);
    });

    it('dataInicio matches provided date', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        for (const slot of slots) {
            expect(slot.dataInicio.getTime()).toBe(baseDate.getTime());
        }
    });

    it('dataFim is dataInicio + duracaoDias', () => {
        const duracaoDias = 15;
        const slots = gerarSlots24h('eq-1', baseDate, duracaoDias);
        const expectedEnd = new Date(baseDate.getTime() + duracaoDias * 24 * 60 * 60 * 1000);
        for (const slot of slots) {
            expect(slot.dataFim.getTime()).toBe(expectedEnd.getTime());
        }
    });

    it('diaSemana rotates within 0-3 for each group', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 30);
        // C1(i=0)→0, C2(i=1)→1, C3(i=2)→2, C4(i=3)→3
        expect(slots[0].diaSemana).toBe(0);
        expect(slots[1].diaSemana).toBe(1);
        expect(slots[2].diaSemana).toBe(2);
        expect(slots[3].diaSemana).toBe(3);
        // C5(i=4)→0, C6(i=5)→1, C7(i=6)→2, C8(i=7)→3
        expect(slots[4].diaSemana).toBe(0);
        expect(slots[5].diaSemana).toBe(1);
        expect(slots[6].diaSemana).toBe(2);
        expect(slots[7].diaSemana).toBe(3);
    });

    it('handles single-day duration', () => {
        const slots = gerarSlots24h('eq-1', baseDate, 1);
        const expectedEnd = new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000);
        expect(slots[0].dataFim.getTime()).toBe(expectedEnd.getTime());
    });
});
