export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Register graceful shutdown handlers
        await import('./lib/shutdown');

        const { startWhatsAppWorker } = await import('./lib/jobs/whatsapp.worker');
        await startWhatsAppWorker();
    }
}
