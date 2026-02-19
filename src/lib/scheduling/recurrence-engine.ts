export type RecurrenceType =
    | 'NONE'
    | 'WEEKLY'
    | 'BIWEEKLY'
    | 'MONTHLY'
    | 'CUSTOM_DATES'
    | 'PACKAGE';

export type HolidayType = 'NATIONAL' | 'CUSTOM' | 'YEAR_END';
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface HolidayInput {
    date: string;
    type?: HolidayType;
    name?: string;
    recurringAnnual?: boolean;
}

export interface PlanningInput {
    recurrenceType: RecurrenceType;
    startDate: string;
    endDate?: string;
    durationDays?: number;
    occurrences?: number;
    daysOfWeek?: number[];
    interval?: number;
    shiftType: 'DIURNO' | 'NOTURNO' | '24H' | 'CUSTOM';
    shiftStart?: string;
    shiftEnd?: string;
    hoursPerOccurrence: number;
    holidays?: Array<string | HolidayInput>;
    excludedDates?: string[];
    includedDates?: string[];
    customDates?: string[];
    quantityPatients: number;
    additionalPercent?: number;
    debug?: boolean;
}

export interface NormalizedScheduleOccurrence {
    date: string;
    startAt?: string;
    endAt?: string;
    hours: number;
    dayType?: DayType;
    tags?: string[];
    isWeekend?: boolean;
    isHoliday: boolean;
    holidayType?: HolidayType;
}

export interface NormalizedSchedule {
    occurrences: NormalizedScheduleOccurrence[];
    totalHours: number;
    totalDays: number;
    totalOccurrences?: number;
    totalDaysActive?: number;
    windowStart?: string;
    windowEnd?: string;
    activeDays?: number;
    debug?: {
        generatedDates: string[];
        includedDates: string[];
        excludedDates: string[];
    };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function parseIsoDate(value: string | undefined, field: string): Date {
    if (!value || !ISO_RE.test(value)) {
        throw new Error(`${field} deve estar no formato YYYY-MM-DD`);
    }

    const [year, month, day] = value.split('-').map((item) => Number(item));
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${field} invalida`);
    }

    return parsed;
}

function parseTimeMinutes(value: string | undefined): number | null {
    if (!value || !TIME_RE.test(value)) return null;
    const [hours, minutes] = value.split(':').map((item) => Number(item));
    return (hours * 60) + minutes;
}

function toIsoDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + (days * DAY_MS));
}

function startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayDiff(start: Date, end: Date): number {
    return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS);
}

function dateWithMinutes(date: Date, minutes: number): Date {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hour,
        minute,
        0,
        0,
    ));
}

function toIsoDateTime(date: Date): string {
    return date.toISOString();
}

function normalizeDateSet(values: string[] | undefined): Set<string> {
    const output = new Set<string>();
    for (const value of values || []) {
        if (!value) continue;
        output.add(toIsoDate(parseIsoDate(value, 'data')));
    }
    return output;
}

function normalizeDaysOfWeek(daysOfWeek: number[] | undefined, startDate: Date): number[] {
    const normalized = (daysOfWeek || [])
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);

    if (!normalized.length) {
        return [startDate.getUTCDay()];
    }

    return [...new Set(normalized)].sort((a, b) => a - b);
}

function getWeekOfMonth(date: Date): number {
    return Math.ceil(date.getUTCDate() / 7);
}

function resolveShiftMinutes(input: PlanningInput): { start: number; end: number; crossMidnight: boolean } {
    if (input.shiftType === '24H') {
        return { start: 0, end: 0, crossMidnight: false };
    }

    const defaultByType = input.shiftType === 'NOTURNO'
        ? { start: '19:00', end: '07:00' }
        : { start: '07:00', end: '19:00' };
    const startRaw = input.shiftStart ?? defaultByType.start;
    const endRaw = input.shiftEnd ?? defaultByType.end;
    const start = parseTimeMinutes(startRaw);
    const end = parseTimeMinutes(endRaw);

    if (start === null || end === null) {
        throw new Error('shiftStart/shiftEnd invalidos, esperado HH:mm');
    }

    return { start, end, crossMidnight: end <= start };
}

function resolveHoursPerOccurrence(input: PlanningInput, shiftMinutes: { start: number; end: number; crossMidnight: boolean }): number {
    if (input.shiftType === '24H') return 24;

    const byShift = shiftMinutes.crossMidnight
        ? ((24 * 60) - shiftMinutes.start + shiftMinutes.end) / 60
        : (shiftMinutes.end - shiftMinutes.start) / 60;
    if (byShift > 0) return byShift;

    const fallback = Number(input.hoursPerOccurrence);
    if (!Number.isFinite(fallback) || fallback <= 0) {
        throw new Error('hoursPerOccurrence deve ser maior que zero');
    }
    return fallback;
}

function resolveEndDate(input: PlanningInput, startDate: Date): Date {
    if (input.endDate) {
        const parsed = parseIsoDate(input.endDate, 'endDate');
        if (parsed < startDate) {
            throw new Error('endDate deve ser maior ou igual a startDate');
        }
        return parsed;
    }

    if (input.durationDays !== undefined) {
        const durationDays = Math.max(1, Math.round(input.durationDays));
        return addDays(startDate, durationDays - 1);
    }

    if (input.recurrenceType === 'NONE') return startDate;

    const occurrences = Math.max(1, Math.round(input.occurrences ?? 1));
    const interval = Math.max(1, Math.round(input.interval ?? 1));

    if (input.recurrenceType === 'PACKAGE') {
        return addDays(startDate, Math.max(0, (occurrences - 1) * interval));
    }
    if (input.recurrenceType === 'CUSTOM_DATES') {
        return addDays(startDate, 365);
    }
    if (input.recurrenceType === 'MONTHLY') {
        return addDays(startDate, Math.max(30, occurrences * interval * 31));
    }

    return addDays(startDate, Math.max(7, occurrences * interval * 7));
}

function generateByWeeklyRule(input: PlanningInput, startDate: Date, endDate: Date): string[] {
    const interval = Math.max(1, Math.round(input.interval ?? (input.recurrenceType === 'BIWEEKLY' ? 2 : 1)));
    const allowedDays = new Set(normalizeDaysOfWeek(input.daysOfWeek, startDate));
    const output: string[] = [];
    const totalDays = Math.max(0, dayDiff(startDate, endDate));

    for (let offset = 0; offset <= totalDays; offset += 1) {
        const current = addDays(startDate, offset);
        if (!allowedDays.has(current.getUTCDay())) continue;

        const weeksOffset = Math.floor(offset / 7);
        if (weeksOffset % interval !== 0) continue;
        output.push(toIsoDate(current));
    }

    return output;
}

function generateByMonthlyRule(input: PlanningInput, startDate: Date, endDate: Date): string[] {
    const interval = Math.max(1, Math.round(input.interval ?? 1));
    const allowedDays = normalizeDaysOfWeek(input.daysOfWeek, startDate);
    const startWeekOfMonth = getWeekOfMonth(startDate);
    const startDayOfMonth = startDate.getUTCDate();
    const hasCustomWeekdays = (input.daysOfWeek || []).length > 0;
    const output: string[] = [];
    const totalDays = Math.max(0, dayDiff(startDate, endDate));

    for (let offset = 0; offset <= totalDays; offset += 1) {
        const current = addDays(startDate, offset);
        const monthOffset = ((current.getUTCFullYear() - startDate.getUTCFullYear()) * 12)
            + (current.getUTCMonth() - startDate.getUTCMonth());
        if (monthOffset < 0 || monthOffset % interval !== 0) continue;

        if (!hasCustomWeekdays) {
            if (current.getUTCDate() === startDayOfMonth) {
                output.push(toIsoDate(current));
            }
            continue;
        }

        const currentWeekday = current.getUTCDay();
        if (!allowedDays.includes(currentWeekday)) continue;
        if (getWeekOfMonth(current) !== startWeekOfMonth) continue;
        output.push(toIsoDate(current));
    }

    return output;
}

function forceExpectedOccurrences(dates: string[], input: PlanningInput): string[] {
    const expected = Math.max(0, Math.round(input.occurrences ?? 0));
    if (expected <= 0 || input.endDate || input.durationDays) return dates;
    if (dates.length <= expected) return dates;
    return dates.slice(0, expected);
}

function normalizeHolidayMap(holidays: Array<string | HolidayInput> | undefined): Map<string, HolidayType> {
    const map = new Map<string, HolidayType>();
    for (const item of holidays || []) {
        if (!item) continue;

        if (typeof item === 'string') {
            map.set(toIsoDate(parseIsoDate(item, 'holiday')), 'CUSTOM');
            continue;
        }

        const parsedDate = parseIsoDate(item.date, 'holiday');
        const iso = toIsoDate(parsedDate);
        const holidayType = item.type ?? 'CUSTOM';
        map.set(iso, holidayType);

        if (item.recurringAnnual) {
            map.set(`annual:${iso.slice(5)}`, holidayType);
        }
    }
    return map;
}

function resolveHolidayType(dateIso: string, holidayMap: Map<string, HolidayType>): HolidayType | undefined {
    return holidayMap.get(dateIso) ?? holidayMap.get(`annual:${dateIso.slice(5)}`);
}

function createOccurrenceSegments(
    date: Date,
    dateIso: string,
    hours: number,
    shiftMinutes: { start: number; end: number; crossMidnight: boolean },
): Array<{ startAt: Date; endAt: Date; hours: number; tags: string[] }> {
    if (hours >= 24 || !shiftMinutes.crossMidnight) {
        const startAt = dateWithMinutes(date, shiftMinutes.start);
        const endAt = hours >= 24
            ? dateWithMinutes(addDays(date, 1), shiftMinutes.start)
            : dateWithMinutes(shiftMinutes.end > shiftMinutes.start ? date : addDays(date, 1), shiftMinutes.end);
        return [{ startAt, endAt, hours: round2(hours), tags: [] }];
    }

    const firstHours = round2(((24 * 60) - shiftMinutes.start) / 60);
    const secondHours = round2(Math.max(0, hours - firstHours));
    const firstStart = dateWithMinutes(date, shiftMinutes.start);
    const firstEnd = dateWithMinutes(addDays(date, 1), 0);
    const secondStart = firstEnd;
    const secondEnd = dateWithMinutes(addDays(date, 1), shiftMinutes.end);

    return [
        {
            startAt: firstStart,
            endAt: firstEnd,
            hours: firstHours,
            tags: ['CROSS_MIDNIGHT', `${dateIso}_SEGMENT_1`],
        },
        {
            startAt: secondStart,
            endAt: secondEnd,
            hours: secondHours,
            tags: ['CROSS_MIDNIGHT', `${dateIso}_SEGMENT_2`],
        },
    ].filter((item) => item.hours > 0);
}

function buildGeneratedDates(input: PlanningInput, startDate: Date, endDate: Date): string[] {
    const generated = new Set<string>();
    const includedSet = normalizeDateSet(input.includedDates);
    const excludedSet = normalizeDateSet(input.excludedDates);

    if (input.recurrenceType === 'NONE') {
        generated.add(toIsoDate(startDate));
    } else if (input.recurrenceType === 'CUSTOM_DATES') {
        for (const date of normalizeDateSet(input.customDates)) generated.add(date);
        for (const date of includedSet) generated.add(date);
        generated.add(toIsoDate(startDate));
    } else if (input.recurrenceType === 'PACKAGE') {
        const occurrences = Math.max(1, Math.round(input.occurrences ?? 1));
        const interval = Math.max(1, Math.round(input.interval ?? 1));
        const allowedDays = new Set(normalizeDaysOfWeek(input.daysOfWeek, startDate));

        let cursor = startDate;
        let emitted = 0;
        while (cursor <= endDate && emitted < occurrences) {
            if (allowedDays.has(cursor.getUTCDay())) {
                generated.add(toIsoDate(cursor));
                emitted += 1;
            }
            cursor = addDays(cursor, interval);
        }
    } else if (input.recurrenceType === 'MONTHLY') {
        for (const date of generateByMonthlyRule(input, startDate, endDate)) {
            generated.add(date);
        }
    } else {
        for (const date of generateByWeeklyRule(input, startDate, endDate)) {
            generated.add(date);
        }
    }

    for (const forcedDate of includedSet) {
        const parsed = parseIsoDate(forcedDate, 'includedDate');
        if (parsed >= startDate && parsed <= endDate) {
            generated.add(forcedDate);
        }
    }

    for (const date of excludedSet) {
        generated.delete(date);
    }

    const dates = forceExpectedOccurrences([...generated].sort(), input);
    return dates;
}

export function generateSchedule(input: PlanningInput): NormalizedSchedule {
    const startDate = parseIsoDate(input.startDate, 'startDate');
    const endDate = resolveEndDate(input, startDate);
    const shiftMinutes = resolveShiftMinutes(input);
    const occurrenceHours = resolveHoursPerOccurrence(input, shiftMinutes);

    const holidayMap = normalizeHolidayMap(input.holidays);
    const generatedDates = buildGeneratedDates(input, startDate, endDate);

    const occurrences: NormalizedScheduleOccurrence[] = [];
    for (const dateIso of generatedDates) {
        const date = parseIsoDate(dateIso, 'occurrenceDate');
        const holidayType = resolveHolidayType(dateIso, holidayMap);
        const isHoliday = Boolean(holidayType);
        const isWeekend = [0, 6].includes(date.getUTCDay());
        const dayType: DayType = isHoliday ? 'HOLIDAY' : isWeekend ? 'WEEKEND' : 'WEEKDAY';
        const baseTags = [input.recurrenceType, input.shiftType];

        const segments = createOccurrenceSegments(date, dateIso, occurrenceHours, shiftMinutes);
        for (const segment of segments) {
            occurrences.push({
                date: dateIso,
                startAt: toIsoDateTime(segment.startAt),
                endAt: toIsoDateTime(segment.endAt),
                hours: segment.hours,
                dayType,
                tags: [...baseTags, ...segment.tags],
                isWeekend,
                isHoliday,
                holidayType,
            });
        }
    }

    const totalHours = round2(occurrences.reduce((acc, item) => acc + item.hours, 0));
    const uniqueDays = new Set(occurrences.map((item) => item.date)).size;
    const windowStart = toIsoDate(startDate);
    const windowEnd = toIsoDate(endDate);

    const normalized: NormalizedSchedule = {
        occurrences: occurrences.sort((a, b) => {
            const aStart = a.startAt || '';
            const bStart = b.startAt || '';
            const aEnd = a.endAt || '';
            const bEnd = b.endAt || '';
            if (aStart === bStart) return aEnd.localeCompare(bEnd);
            return aStart.localeCompare(bStart);
        }),
        totalHours,
        totalOccurrences: occurrences.length,
        totalDaysActive: uniqueDays,
        totalDays: uniqueDays,
        activeDays: uniqueDays,
        windowStart,
        windowEnd,
    };

    if (input.debug) {
        normalized.debug = {
            generatedDates: [...generatedDates],
            includedDates: [...normalizeDateSet(input.includedDates)],
            excludedDates: [...normalizeDateSet(input.excludedDates)],
        };
    }

    return normalized;
}
