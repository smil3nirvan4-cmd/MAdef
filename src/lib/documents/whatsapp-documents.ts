import logger from '@/lib/logger';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';
import { extractProviderMessageId } from '@/lib/whatsapp/provider-message-id';

type DeliveryStatus = 'SENT_CONFIRMED' | 'UNCONFIRMED' | 'FAILED';

interface DocumentSendResult {
    success: boolean;
    deliveryStatus: DeliveryStatus;
    bridgeAccepted?: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
    statusCode?: number;
    circuitState?: unknown;
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
            errorCode: 'INVALID_PHONE',
            recommendedCommand: bridgeConfig.recommendedCommand,
        };
    }

    if (normalized.type !== 'celular') {
        return {
            success: false,
            deliveryStatus: 'FAILED',
            error: 'WhatsApp requer numero de celular',
            errorCode: 'INVALID_PHONE',
            recommendedCommand: bridgeConfig.recommendedCommand,
            e164: normalized.e164,
            jid: normalized.jid,
        };
    }

    try {
        if (whatsappCircuitBreaker.isOpen()) {
            throw Object.assign(
                new Error('WhatsApp circuit breaker is OPEN - bridge calls are suspended'),
                { code: 'CIRCUIT_OPEN', circuitState: whatsappCircuitBreaker.toJSON() }
            );
        }

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
            if (response.status >= 500) {
                whatsappCircuitBreaker.recordFailure(response.status);
            }

            return {
                success: false,
                deliveryStatus: 'FAILED',
                bridgeAccepted: false,
                error: payload?.error || `Bridge error HTTP ${response.status}`,
                errorCode: payload?.code || (response.status >= 500 ? 'BRIDGE_UNAVAILABLE' : 'PROVIDER_ERROR'),
                statusCode: response.status,
                recommendedCommand: bridgeConfig.recommendedCommand,
                e164: normalized.e164,
                jid: normalized.jid,
            };
        }

        if (!messageId) {
            whatsappCircuitBreaker.recordFailure(503);
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
                errorCode: 'UNCONFIRMED_SEND',
                recommendedCommand: bridgeConfig.recommendedCommand,
                e164: normalized.e164,
                jid: normalized.jid,
            };
        }

        whatsappCircuitBreaker.recordSuccess();

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
        const errorCode = String(error?.code || '');
        if (errorCode !== 'CIRCUIT_OPEN') {
            whatsappCircuitBreaker.recordFailure();
        }

        return {
            success: false,
            deliveryStatus: 'FAILED',
            error: error?.message || 'Falha ao enviar documento',
            errorCode: errorCode || 'INTERNAL_ERROR',
            circuitState: error?.circuitState,
            recommendedCommand: bridgeConfig.recommendedCommand,
            e164: normalized.e164,
            jid: normalized.jid,
        };
    }
}
