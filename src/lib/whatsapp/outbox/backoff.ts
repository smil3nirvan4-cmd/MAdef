const DEFAULT_BASE_MS = 30_000;
const DEFAULT_MAX_MS = 30 * 60_000;

export function calculateRetryBackoffMs(
    retryCount: number,
    baseMs = DEFAULT_BASE_MS,
    maxMs = DEFAULT_MAX_MS
): number {
    const safeRetryCount = Math.max(1, Math.floor(retryCount));
    const delay = baseMs * (2 ** (safeRetryCount - 1));
    return Math.min(delay, maxMs);
}

export function calculateRetryDate(
    retryCount: number,
    now: Date = new Date(),
    baseMs = DEFAULT_BASE_MS,
    maxMs = DEFAULT_MAX_MS
): Date {
    return new Date(now.getTime() + calculateRetryBackoffMs(retryCount, baseMs, maxMs));
}

