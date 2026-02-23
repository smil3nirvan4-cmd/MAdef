export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handlePost(request: NextRequest) {
    try {
        const guard = await guardCapability('SEND_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const phones = Array.isArray(body?.phones) ? body.phones.map((p: unknown) => String(p)) : [];
        const message = body?.message ? String(body.message) : body?.template ? String(body.template) : '';

        if (phones.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum destinatario' }, { status: 400 });
        }

        if (!message.trim()) {
            return NextResponse.json({ success: false, error: 'Mensagem obrigatoria' }, { status: 400 });
        }

        const campaignId = String(body?.campaignId || `broadcast_${Date.now()}`);
        const enqueued: Array<{ queueItemId: string; phone: string; duplicated: boolean }> = [];
        const failures: Array<{ phone: string; error: string }> = [];

        for (const [index, phone] of phones.entries()) {
            try {
                const job = await enqueueWhatsAppTextJob({
                    phone,
                    text: message,
                    idempotencyKey: `${campaignId}:${index}:${phone.replace(/\D/g, '')}`,
                    context: {
                        source: 'admin_broadcast',
                    },
                    metadata: {
                        campaignId,
                        type: 'BROADCAST',
                    },
                });

                enqueued.push({ queueItemId: job.queueItemId, phone, duplicated: job.duplicated });
            } catch (error) {
                failures.push({
                    phone,
                    error: error instanceof Error ? error.message : 'Falha ao enfileirar',
                });
            }
        }

        const worker = await processWhatsAppOutboxOnce({ limit: Math.min(50, enqueued.length || 1) });

        return NextResponse.json({
            success: failures.length === 0,
            campaignId,
            enqueuedCount: enqueued.length,
            failedCount: failures.length,
            enqueued,
            failures,
            worker,
            message: `Broadcast processado: ${enqueued.length} enfileiradas, ${failures.length} falhas`,
        });
    } catch (error) {
        await logger.error('broadcast_post_error', 'Erro ao processar broadcast', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao processar broadcast' }, { status: 500 });
    }
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 3, windowMs: 300_000 });
