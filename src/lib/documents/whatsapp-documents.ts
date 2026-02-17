import logger from '@/lib/logger';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import { extractProviderMessageId } from '@/lib/whatsapp/provider-message-id';

type DeliveryStatus = 'SENT_CONFIRMED' | 'UNCONFIRMED' | 'FAILED';

interface DocumentSendResult {
    success: boolean;
    deliveryStatus: DeliveryStatus;
    bridgeAccepted?: boolean;
    messageId?: string;
    error?: string;
    recommendedCommand: string;
    e164?: string;
    jid?: string;
}

export async function sendDocumentViaBridge(params: {
    phone: string;
    fileName: string;
    caption: string;
    buffer: Buffer;
}): Promise<DocumentSendResult> {
    const bridgeConfig = resolveBridgeConfig();
    const normalized = normalizeOutboundPhoneBR(params.phone);

    if (!normalized.isValid) {
        return {
            success: false,
            deliveryStatus: 'FAILED',
            error: normalized.error || 'Telefone invalido',
            recommendedCommand: bridgeConfig.recommendedCommand,
        };
    }

    if (normalized.type !== 'celular') {
        return {
            success: false,
            deliveryStatus: 'FAILED',
            error: 'WhatsApp requer numero de celular',
            recommendedCommand: bridgeConfig.recommendedCommand,
            e164: normalized.e164,
            jid: normalized.jid,
        };
    }

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/send-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: normalized.jid,
                document: params.buffer.toString('base64'),
                fileName: params.fileName,
                caption: params.caption,
                mimetype: 'application/pdf',
            }),
            signal: AbortSignal.timeout(15000),
        });

        const payload: any = await response.json().catch(() => ({}));
        const messageId = extractProviderMessageId(payload);

        if (!response.ok || payload?.success === false) {
            return {
                success: false,
                deliveryStatus: 'FAILED',
                bridgeAccepted: false,
                error: payload?.error || `Bridge error HTTP ${response.status}`,
                recommendedCommand: bridgeConfig.recommendedCommand,
                e164: normalized.e164,
                jid: normalized.jid,
            };
        }

        if (!messageId) {
            const error = 'Envio sem confirmacao: bridge retornou sucesso sem messageId.';

            await logger.warning('whatsapp_document_unconfirmed', error, {
                phone: params.phone,
                e164: normalized.e164,
                jid: normalized.jid,
                fileName: params.fileName,
                providerMessageId: null,
                bridgePayload: payload,
            });

            return {
                success: false,
                deliveryStatus: 'UNCONFIRMED',
                bridgeAccepted: true,
                error,
                recommendedCommand: bridgeConfig.recommendedCommand,
                e164: normalized.e164,
                jid: normalized.jid,
            };
        }

        return {
            success: true,
            deliveryStatus: 'SENT_CONFIRMED',
            bridgeAccepted: true,
            messageId,
            recommendedCommand: bridgeConfig.recommendedCommand,
            e164: normalized.e164,
            jid: normalized.jid,
        };
    } catch (error: any) {
        return {
            success: false,
            deliveryStatus: 'FAILED',
            error: error?.message || 'Falha ao enviar documento',
            recommendedCommand: bridgeConfig.recommendedCommand,
            e164: normalized.e164,
            jid: normalized.jid,
        };
    }
}
