/**
 * Next.js Instrumentation Hook
 * Runs once when the Node.js runtime starts.
 * Used to initialize BullMQ workers and other server-side services.
 */
export async function register() {
    // Only start workers on the server side (not in Edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startWhatsAppWorker } = await import('@/lib/jobs/whatsapp.worker');
        const worker = startWhatsAppWorker();
        if (worker) {
            console.log('[Instrumentation] WhatsApp BullMQ worker started');
        }
    }
}
