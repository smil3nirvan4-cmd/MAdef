import { describe, it, expect } from 'vitest';
import { metrics } from '../metrics';

describe('MetricsCollector', () => {
    it('increments counters', () => {
        metrics.increment('test_counter');
        metrics.increment('test_counter');
        const snap = metrics.snapshot();
        expect(snap.counters.test_counter.value).toBeGreaterThanOrEqual(2);
    });

    it('tracks labels on counters', () => {
        metrics.increment('labeled_counter', { method: 'GET', status: '200' });
        const snap = metrics.snapshot();
        expect(snap.counters.labeled_counter.labels).toBeDefined();
    });

    it('observes histogram values', () => {
        metrics.observe('test_histogram', 50);
        metrics.observe('test_histogram', 150);
        metrics.observe('test_histogram', 500);
        const snap = metrics.snapshot();
        expect(snap.histograms.test_histogram.count).toBe(3);
        expect(snap.histograms.test_histogram.avg).toBeGreaterThan(0);
    });

    it('includes memory and uptime in snapshot', () => {
        const snap = metrics.snapshot();
        expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
        expect(snap.memory.heapUsedMB).toBeGreaterThan(0);
        expect(snap.memory.rssMB).toBeGreaterThan(0);
    });
});
