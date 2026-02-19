export type PlanningPeriodicity = 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';

export interface PlanningEstimateInput {
    dataInicioCuidado?: string;
    dataFimCuidado?: string;
    periodicidade?: PlanningPeriodicity;
    semanasPlanejadas?: number;
    mesesPlanejados?: number;
    horasCuidadoDia?: number;
    diasAtendimento?: string[];
}

export interface PlanningEstimateOutput {
    inicioISO: string;
    fimISO: string;
    periodicidade: PlanningPeriodicity;
    diasCorridos: number;
    diasAtivos: number;
    horasDiarias: number;
    horasTotais: number;
    diasAtendimentoNormalizados: string[];
    recorrenciaDescricao: string;
}

const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

const WEEKDAY_TOKEN_MAP: Record<string, number> = {
    dom: 0,
    domingo: 0,
    sun: 0,
    seg: 1,
    segunda: 1,
    monday: 1,
    mon: 1,
    ter: 2,
    terca: 2,
    terça: 2,
    tuesday: 2,
    tue: 2,
    qua: 3,
    quarta: 3,
    wednesday: 3,
    wed: 3,
    qui: 4,
    quinta: 4,
    thursday: 4,
    thu: 4,
    sex: 5,
    sexta: 5,
    friday: 5,
    fri: 5,
    sab: 6,
    sabado: 6,
    sábado: 6,
    saturday: 6,
    sat: 6,
};

function toLocalISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseLocalISODate(value?: string): Date | null {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split('-').map((item) => Number(item));
    if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null;
    const [year, month, day] = parts;
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
    const output = new Date(date);
    output.setDate(output.getDate() + days);
    return output;
}

function diffDays(start: Date, end: Date): number {
    const a = startOfDay(start).getTime();
    const b = startOfDay(end).getTime();
    return Math.floor((b - a) / 86400000);
}

function resolvePeriodicidade(value?: string): PlanningPeriodicity {
    const normalized = String(value || 'SEMANAL').toUpperCase();
    if (normalized === 'DIARIO') return 'DIARIO';
    if (normalized === 'QUINZENAL') return 'QUINZENAL';
    if (normalized === 'MENSAL') return 'MENSAL';
    return 'SEMANAL';
}

function roundInteger(value: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.round(parsed);
}

function resolveWeeks(value?: number): number {
    return Math.max(1, roundInteger(value ?? 4, 4));
}

function resolveMonths(value?: number): number {
    return Math.max(1, roundInteger(value ?? 1, 1));
}

function resolveHours(value?: number): number {
    const parsed = roundInteger(value ?? 12, 12);
    return Math.min(24, Math.max(1, parsed));
}

export function normalizeWeekdayTokens(values: string[] = []): number[] {
    const indexes = values
        .map((raw) => String(raw || '').trim().toLowerCase())
        .flatMap((token) => {
            if (!token) return [];
            if (/^\d+$/.test(token)) {
                const asNumber = Number(token);
                if (asNumber >= 0 && asNumber <= 6) return [asNumber];
            }
            const mapped = WEEKDAY_TOKEN_MAP[token];
            return mapped === undefined ? [] : [mapped];
        });

    return [...new Set(indexes)].sort((a, b) => a - b);
}

function toWeekdayShortList(indexes: number[]): string[] {
    return indexes
        .filter((index) => index >= 0 && index <= 6)
        .map((index) => WEEKDAY_SHORT[index]);
}

function resolveRangeStart(input: PlanningEstimateInput, baseDate: Date): Date {
    return startOfDay(parseLocalISODate(input.dataInicioCuidado) || baseDate);
}

function resolveRangeEnd(
    input: PlanningEstimateInput,
    start: Date,
    periodicidade: PlanningPeriodicity,
): Date {
    const explicitEnd = parseLocalISODate(input.dataFimCuidado);
    if (explicitEnd && explicitEnd >= start) {
        return startOfDay(explicitEnd);
    }

    const weeks = resolveWeeks(input.semanasPlanejadas);
    const months = resolveMonths(input.mesesPlanejados);
    let totalDays = weeks * 7;

    if (periodicidade === 'MENSAL') {
        totalDays = Math.max(28, months * 30);
    }

    if (periodicidade === 'QUINZENAL') {
        totalDays = Math.max(14, weeks * 7);
    }

    return addDays(start, Math.max(1, totalDays) - 1);
}

function sameWeekOfMonth(a: Date, b: Date): boolean {
    const weekA = Math.ceil(a.getDate() / 7);
    const weekB = Math.ceil(b.getDate() / 7);
    return weekA === weekB;
}

function matchesPeriodicity(date: Date, start: Date, periodicidade: PlanningPeriodicity): boolean {
    if (periodicidade === 'QUINZENAL') {
        const weekOffset = Math.floor(diffDays(start, date) / 7);
        return weekOffset % 2 === 0;
    }

    if (periodicidade === 'MENSAL') {
        return sameWeekOfMonth(date, start);
    }

    return true;
}

export function estimatePlanning(
    input: PlanningEstimateInput,
    baseDate = new Date(),
): PlanningEstimateOutput {
    const periodicidade = resolvePeriodicidade(input.periodicidade);
    const start = resolveRangeStart(input, baseDate);
    const end = resolveRangeEnd(input, start, periodicidade);
    const daysDiff = Math.max(0, diffDays(start, end));
    const diasCorridos = daysDiff + 1;
    const horasDiarias = resolveHours(input.horasCuidadoDia);
    const weekdays = normalizeWeekdayTokens(input.diasAtendimento || []);
    const fallbackWeekday = start.getDay();
    let diasAtivos = 0;

    for (let offset = 0; offset <= daysDiff; offset += 1) {
        const current = addDays(start, offset);
        const currentWeekday = current.getDay();
        const weekdayMatch = weekdays.length > 0
            ? weekdays.includes(currentWeekday)
            : periodicidade === 'DIARIO'
                ? true
                : currentWeekday === fallbackWeekday;

        if (!weekdayMatch) continue;
        if (!matchesPeriodicity(current, start, periodicidade)) continue;
        diasAtivos += 1;
    }

    if (diasAtivos <= 0) diasAtivos = 1;
    const horasTotais = diasAtivos * horasDiarias;
    const diasAtendimentoNormalizados = toWeekdayShortList(weekdays);
    const diasLabel = diasAtendimentoNormalizados.length
        ? diasAtendimentoNormalizados.join(',')
        : periodicidade === 'DIARIO'
            ? 'todos os dias'
            : WEEKDAY_SHORT[fallbackWeekday];

    return {
        inicioISO: toLocalISODate(start),
        fimISO: toLocalISODate(end),
        periodicidade,
        diasCorridos,
        diasAtivos,
        horasDiarias,
        horasTotais,
        diasAtendimentoNormalizados,
        recorrenciaDescricao: `${periodicidade} • ${diasLabel}`,
    };
}
