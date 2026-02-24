export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Initialize OpenTelemetry tracing (before other imports)
        const { initTracing } = await import('./lib/observability/tracing');
        initTracing();

        // Register graceful shutdown handlers
        await import('./lib/shutdown');

        const { startWhatsAppWorker } = await import('./lib/jobs/whatsapp.worker');
        await startWhatsAppWorker();
    }
}
