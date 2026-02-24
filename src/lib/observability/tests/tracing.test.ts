import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('tracing', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not crash when OTEL_ENABLED is unset', async () => {
        delete process.env.OTEL_ENABLED;
        const { initTracing } = await import('../tracing');
        expect(() => initTracing()).not.toThrow();
    });

    it('does not crash when OTEL_ENABLED is false', async () => {
        process.env.OTEL_ENABLED = 'false';
        const { initTracing } = await import('../tracing');
        expect(() => initTracing()).not.toThrow();
    });

    it('returns null SDK when disabled', async () => {
        process.env.OTEL_ENABLED = 'false';
        const { initTracing, getSDK } = await import('../tracing');
        initTracing();
        expect(getSDK()).toBeNull();
    });

    it('starts SDK when OTEL_ENABLED is true (console exporter)', async () => {
        process.env.OTEL_ENABLED = 'true';
        delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
        const { initTracing, getSDK } = await import('../tracing');
        expect(() => initTracing()).not.toThrow();
        const sdk = getSDK();
        expect(sdk).toBeDefined();
        expect(sdk).not.toBeNull();
        // Clean up
        await sdk?.shutdown();
    });

    it('starts SDK with OTLP exporter when endpoint is set', async () => {
        process.env.OTEL_ENABLED = 'true';
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
        const { initTracing, getSDK } = await import('../tracing');
        expect(() => initTracing()).not.toThrow();
        const sdk = getSDK();
        expect(sdk).not.toBeNull();
        await sdk?.shutdown();
    });
});
