import { describe, it, expect } from 'vitest';
import { gerarSlots24h } from './slots';
import type { Slot } from './slots';

describe('gerarSlots24h', () => {
    const equipeId = 'equipe-1';
    const dataInicio = new Date('2026-03-01T00:00:00.000Z');
    const duracaoDias = 30;

    describe('slot count and IDs', () => {
        it('generates exactly 8 slots', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            expect(slots).toHaveLength(8);
        });

        it('assigns sequential IDs from C1 to C8', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            const ids = slots.map(s => s.id);
            expect(ids).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']);
        });
    });

    describe('equipeId assignment', () => {
        it('sets equipeId on all slots', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.equipeId).toBe(equipeId);
            }
        });

        it('uses the provided equipeId value', () => {
            const slots = gerarSlots24h('custom-equipe', dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.equipeId).toBe('custom-equipe');
            }
        });
    });

    describe('turno assignment (12x36 schedule)', () => {
        it('assigns MANHA to C1-C4 (first 4 slots)', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (let i = 0; i < 4; i++) {
                expect(slots[i].turno).toBe('MANHA');
            }
        });

        it('assigns NOITE to C5-C8 (last 4 slots)', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (let i = 4; i < 8; i++) {
                expect(slots[i].turno).toBe('NOITE');
            }
        });
    });

    describe('diaSemana assignment', () => {
        it('assigns diaSemana cycling 0-3 for each turno group', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            // C1=0, C2=1, C3=2, C4=3 (MANHA)
            expect(slots[0].diaSemana).toBe(0);
            expect(slots[1].diaSemana).toBe(1);
            expect(slots[2].diaSemana).toBe(2);
            expect(slots[3].diaSemana).toBe(3);
            // C5=0, C6=1, C7=2, C8=3 (NOITE)
            expect(slots[4].diaSemana).toBe(0);
            expect(slots[5].diaSemana).toBe(1);
            expect(slots[6].diaSemana).toBe(2);
            expect(slots[7].diaSemana).toBe(3);
        });
    });

    describe('default status', () => {
        it('all slots start as DISPONIVEL', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.status).toBe('DISPONIVEL');
            }
        });
    });

    describe('cuidadorId', () => {
        it('slots are created without cuidadorId', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.cuidadorId).toBeUndefined();
            }
        });
    });

    describe('date calculations', () => {
        it('sets dataInicio to the provided start date', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.dataInicio.getTime()).toBe(dataInicio.getTime());
            }
        });

        it('sets dataFim based on duracaoDias from dataInicio', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            const expectedEnd = new Date(dataInicio.getTime() + 30 * 24 * 60 * 60 * 1000);
            for (const slot of slots) {
                expect(slot.dataFim.getTime()).toBe(expectedEnd.getTime());
            }
        });

        it('creates new Date instances (not references to the original)', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot.dataInicio).not.toBe(dataInicio);
                expect(slot.dataInicio).toEqual(dataInicio);
            }
        });
    });

    describe('edge cases', () => {
        it('handles duracaoDias = 0', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, 0);
            expect(slots).toHaveLength(8);
            for (const slot of slots) {
                expect(slot.dataInicio.getTime()).toBe(slot.dataFim.getTime());
            }
        });

        it('handles duracaoDias = 1', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, 1);
            const expectedEnd = new Date(dataInicio.getTime() + 1 * 24 * 60 * 60 * 1000);
            for (const slot of slots) {
                expect(slot.dataFim.getTime()).toBe(expectedEnd.getTime());
            }
        });

        it('handles large duracaoDias', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, 365);
            const expectedEnd = new Date(dataInicio.getTime() + 365 * 24 * 60 * 60 * 1000);
            for (const slot of slots) {
                expect(slot.dataFim.getTime()).toBe(expectedEnd.getTime());
            }
        });

        it('each slot is a distinct object', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    expect(slots[i]).not.toBe(slots[j]);
                }
            }
        });
    });

    describe('slot structure', () => {
        it('each slot has all required fields', () => {
            const slots = gerarSlots24h(equipeId, dataInicio, duracaoDias);
            for (const slot of slots) {
                expect(slot).toHaveProperty('id');
                expect(slot).toHaveProperty('equipeId');
                expect(slot).toHaveProperty('turno');
                expect(slot).toHaveProperty('diaSemana');
                expect(slot).toHaveProperty('status');
                expect(slot).toHaveProperty('dataInicio');
                expect(slot).toHaveProperty('dataFim');
            }
        });
    });
});
