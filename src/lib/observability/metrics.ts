/**
 * In-process metrics collector for request counters, latency histograms,
 * error counters, cache hits/misses, and queue sizes.
 *
 * Designed to be lightweight — uses Map-based counters that are exposed
 * via GET /api/metrics for scraping by Prometheus or similar.
 */

const counters = new Map<string, number>();
const histogramBuckets = new Map<string, number[]>();

function inc(name: string, value = 1): void {
    counters.set(name, (counters.get(name) || 0) + value);
}

function observe(name: string, value: number): void {
    const arr = histogramBuckets.get(name);
    if (arr) {
        arr.push(value);
        if (arr.length > 10_000) arr.splice(0, arr.length - 5_000);
    } else {
        histogramBuckets.set(name, [value]);
    }
}

function histogramSummary(name: string): { count: number; avg: number; p50: number; p95: number; p99: number } | null {
    const arr = histogramBuckets.get(name);
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = sorted.reduce((s, v) => s + v, 0) / count;
    const p = (pct: number) => sorted[Math.min(Math.floor(count * pct), count - 1)];
    return { count, avg: Math.round(avg * 100) / 100, p50: p(0.5), p95: p(0.95), p99: p(0.99) };
}

export const metrics = {
    /** Increment a named counter */
    inc,

    /** Record a latency observation (milliseconds) */
    observe,

    /** Get a snapshot of all counters */
    getCounters(): Record<string, number> {
        return Object.fromEntries(counters);
    },

    /** Get histogram summary for a specific metric */
    getHistogram: histogramSummary,

    /** Get all histogram summaries */
    getHistograms(): Record<string, ReturnType<typeof histogramSummary>> {
        const result: Record<string, ReturnType<typeof histogramSummary>> = {};
        for (const name of histogramBuckets.keys()) {
            result[name] = histogramSummary(name);
        }
        return result;
    },

    /** Reset all metrics (useful for testing) */
    reset(): void {
        counters.clear();
        histogramBuckets.clear();
    },

    // --- Convenience methods ---

    httpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
        inc('http_requests_total');
        inc(`http_requests_${method.toLowerCase()}`);
        inc(`http_status_${statusCode}`);
        if (statusCode >= 400) inc('http_errors_total');
        if (statusCode >= 500) inc('http_5xx_total');
        observe('http_request_duration_ms', durationMs);
        observe(`http_request_duration_ms:${route}`, durationMs);
    },

    cacheHit(): void { inc('cache_hits'); },
    cacheMiss(): void { inc('cache_misses'); },

    queueEnqueued(queueName: string): void { inc(`queue_enqueued:${queueName}`); },
    queueCompleted(queueName: string): void { inc(`queue_completed:${queueName}`); },
    queueFailed(queueName: string): void { inc(`queue_failed:${queueName}`); },
};
