export const BACKOFF_SCHEDULE_SECONDS = [5, 30, 120, 600, 3600];

function parseMaxRetries(): number {
    const parsed = Number(process.env.WHATSAPP_MAX_RETRIES || '5');
    if (!Number.isFinite(parsed) || parsed <= 0) return 5;
    return Math.floor(parsed);
}

export function calculateNextScheduledAt(attempt: number, baseMs = Date.now()): Date {
    const safeAttempt = Math.max(1, Math.floor(attempt));
    const scheduleIndex = Math.min(safeAttempt, BACKOFF_SCHEDULE_SECONDS.length) - 1;
    const delaySeconds = BACKOFF_SCHEDULE_SECONDS[scheduleIndex];
    return new Date(baseMs + (delaySeconds * 1000));
}

export function shouldDie(retries: number): boolean {
    return retries >= parseMaxRetries();
}
