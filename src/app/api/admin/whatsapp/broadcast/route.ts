export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const MAX_BROADCAST_RECIPIENTS = 500;

const BroadcastSchema = z.object({
    phones: z.array(z.string().min(1)).min(1, 'Nenhum destinatário').max(MAX_BROADCAST_RECIPIENTS, `Máximo de ${MAX_BROADCAST_RECIPIENTS} destinatários`),
    message: z.string().min(1).optional(),
    template: z.string().min(1).optional(),
    campaignId: z.string().optional(),
}).refine(
    (data) => Boolean(data.message?.trim() || data.template?.trim()),
    { message: 'Mensagem ou template é obrigatório' }
);

const postHandler = async (request: NextRequest) => {
    const guard = await guardCapability('SEND_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const ip = getClientIp(request);
    const rateResult = checkRateLimit(`broadcast:${ip}`, 5, 60_000);
    if (!rateResult.allowed) {
        return fail(E.CONFLICT, 'Rate limit exceeded for broadcast', { status: 429 });
    }

    try {
        const body = await request.json();
        const parsed = BroadcastSchema.safeParse(body);

        if (!parsed.success) {
            return fail(E.VALIDATION_ERROR, 'Dados inválidos', {
                status: 400,
                details: parsed.error.issues,
            });
        }

        const { phones, message: rawMessage, template, campaignId: rawCampaignId } = parsed.data;
        const message = rawMessage?.trim() || template?.trim() || '';
        const campaignId = rawCampaignId || `broadcast_${Date.now()}`;

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

        await logger.info('broadcast_sent', `Broadcast ${campaignId}: ${enqueued.length} enfileiradas, ${failures.length} falhas`, {
            campaignId,
            enqueuedCount: enqueued.length,
            failedCount: failures.length,
            totalRecipients: phones.length,
        });

        return ok({
            campaignId,
            enqueuedCount: enqueued.length,
            failedCount: failures.length,
            enqueued,
            failures,
            worker,
            message: `Broadcast processado: ${enqueued.length} enfileiradas, ${failures.length} falhas`,
        });
    } catch (error) {
        await logger.error('broadcast_error', 'Erro ao processar broadcast', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao processar broadcast', { status: 500 });
    }
};

export const POST = withRequestContext(postHandler);
