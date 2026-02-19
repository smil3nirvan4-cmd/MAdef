import type { PlanningInput } from './recurrence-engine';

export interface PlanningPreset {
    id: string;
    label: string;
    description: string;
    planning: Omit<PlanningInput, 'quantityPatients'> & {
        quantityPatients?: number;
    };
}

export const PLANNING_PRESETS: PlanningPreset[] = [
    {
        id: '2X_SEMANA_12H_4S',
        label: '2x semana 12h por 4 semanas',
        description: 'Atendimento recorrente duas vezes por semana.',
        planning: {
            recurrenceType: 'WEEKLY',
            startDate: '',
            occurrences: 8,
            daysOfWeek: [1, 4],
            interval: 1,
            shiftType: 'DIURNO',
            hoursPerOccurrence: 12,
        },
    },
    {
        id: 'SEG_QUA_SEX_12H',
        label: 'Seg/Qua/Sex 12h',
        description: 'Cobertura intercalada em tres dias fixos da semana.',
        planning: {
            recurrenceType: 'WEEKLY',
            startDate: '',
            occurrences: 12,
            daysOfWeek: [1, 3, 5],
            interval: 1,
            shiftType: 'DIURNO',
            hoursPerOccurrence: 12,
        },
    },
    {
        id: 'FDS_24H_RECORRENTE',
        label: 'FDS 24h recorrente',
        description: 'Cobertura apenas sabado e domingo em turno integral.',
        planning: {
            recurrenceType: 'WEEKLY',
            startDate: '',
            occurrences: 8,
            daysOfWeek: [0, 6],
            interval: 1,
            shiftType: '24H',
            hoursPerOccurrence: 24,
        },
    },
    {
        id: 'PACOTE_240H_MES',
        label: 'Pacote 240h/mes',
        description: 'Pacote fechado com total de 240 horas no periodo.',
        planning: {
            recurrenceType: 'PACKAGE',
            startDate: '',
            occurrences: 20,
            interval: 1,
            shiftType: 'DIURNO',
            hoursPerOccurrence: 12,
        },
    },
    {
        id: 'PACOTE_120H_MES',
        label: 'Pacote 120h/mes',
        description: 'Pacote fechado com total de 120 horas no periodo.',
        planning: {
            recurrenceType: 'PACKAGE',
            startDate: '',
            occurrences: 10,
            interval: 1,
            shiftType: 'DIURNO',
            hoursPerOccurrence: 12,
        },
    },
    {
        id: 'VINTE_QUATRO_SETE_30D',
        label: '24x7 por 30 dias',
        description: 'Cobertura continua diaria em turno 24h durante 30 dias.',
        planning: {
            recurrenceType: 'PACKAGE',
            startDate: '',
            occurrences: 30,
            interval: 1,
            shiftType: '24H',
            hoursPerOccurrence: 24,
        },
    },
    {
        id: 'NOTURNO_4_SEMANAS',
        label: 'Noturno 4 semanas',
        description: 'Cobertura noturna recorrente por quatro semanas.',
        planning: {
            recurrenceType: 'WEEKLY',
            startDate: '',
            occurrences: 28,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            interval: 1,
            shiftType: 'NOTURNO',
            shiftStart: '19:00',
            shiftEnd: '07:00',
            hoursPerOccurrence: 12,
        },
    },
];
