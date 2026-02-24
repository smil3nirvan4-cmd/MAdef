export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startWhatsAppWorker } = await import('./lib/jobs/whatsapp.worker');
        await startWhatsAppWorker();
    }
}
