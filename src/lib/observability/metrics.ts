interface Counter {
    value: number;
    labels: Record<string, number>;
}

interface Histogram {
    count: number;
    sum: number;
    buckets: number[];
    boundaries: number[];
}

const HISTOGRAM_BOUNDARIES = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

class MetricsCollector {
    private counters = new Map<string, Counter>();
    private histograms = new Map<string, Histogram>();
    private startedAt = Date.now();

    increment(name: string, labels?: Record<string, string>, value = 1): void {
        const counter = this.counters.get(name) ?? { value: 0, labels: {} };
        counter.value += value;
        if (labels) {
            const key = Object.values(labels).join(':');
            counter.labels[key] = (counter.labels[key] ?? 0) + value;
        }
        this.counters.set(name, counter);
    }

    observe(name: string, value: number): void {
        const hist = this.histograms.get(name) ?? {
            count: 0,
            sum: 0,
            buckets: new Array(HISTOGRAM_BOUNDARIES.length + 1).fill(0),
            boundaries: HISTOGRAM_BOUNDARIES,
        };
        hist.count++;
        hist.sum += value;
        for (let i = 0; i < HISTOGRAM_BOUNDARIES.length; i++) {
            if (value <= HISTOGRAM_BOUNDARIES[i]) {
                hist.buckets[i]++;
            }
        }
        hist.buckets[HISTOGRAM_BOUNDARIES.length]++;
        this.histograms.set(name, hist);
    }

    snapshot() {
        const mem = process.memoryUsage();
        return {
            uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
            memory: {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
                rssMB: Math.round(mem.rss / 1024 / 1024),
            },
            counters: Object.fromEntries(this.counters),
            histograms: Object.fromEntries(
                Array.from(this.histograms.entries()).map(([k, h]) => [
                    k,
                    {
                        count: h.count,
                        sum: h.sum,
                        avg: h.count > 0 ? Math.round(h.sum / h.count) : 0,
                        buckets: Object.fromEntries(
                            h.boundaries.map((b, i) => [`le_${b}`, h.buckets[i]])
                        ),
                    },
                ])
            ),
        };
    }
}

export const metrics = new MetricsCollector();
