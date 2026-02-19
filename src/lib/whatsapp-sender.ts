// ============================================
// WHATSAPP SENDER SERVICE
// ============================================

import { normalizeOutboundPhoneBR } from './phone-validator';
import logger from './logger';
import { resolveBridgeConfig } from './whatsapp/bridge-config';
import { extractProviderMessageId } from './whatsapp/provider-message-id';
import { whatsappCircuitBreaker } from './whatsapp/circuit-breaker';

type DeliveryStatus = 'SENT_CONFIRMED' | 'UNCONFIRMED' | 'FAILED';

interface SendResult {
    success: boolean;
    deliveryStatus: DeliveryStatus;
    bridgeAccepted?: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
    statusCode?: number;
    circuitState?: unknown;
    recommendedCommand?: string;
    timestamp: Date;
    phoneFormatted?: string;
}

export interface PropostaMessageInput {
    pacienteNome: string;
    avaliacaoId: string;
    valorProposto?: string;
}

export function buildAvaliacaoPropostaMessage(input: PropostaMessageInput): string {
    const codigoAvaliacao = input.avaliacaoId.slice(-8).toUpperCase();
    return `
*Maos Amigas - Home Care*

Ola *${input.pacienteNome}*!

Sua avaliacao foi concluida com sucesso!

*Codigo:* ${codigoAvaliacao}
${input.valorProposto ? `*Valor da Proposta:* ${input.valorProposto}` : ''}

Em caso de duvidas, responda esta mensagem.

_Equipe Maos Amigas_
    `.trim();
}

class WhatsAppSenderService {
    private bridgeUrl = '';
    private recommendedCommand = 'npm run dev';

    constructor() {
        this.refreshBridgeConfig();
    }

    private refreshBridgeConfig(): void {
        const config = resolveBridgeConfig();
        this.bridgeUrl = config.bridgeUrl;
        this.recommendedCommand = config.recommendedCommand;
    }

    async checkConnection(): Promise<{ connected: boolean; error?: string; recommendedCommand?: string }> {
        try {
            this.refreshBridgeConfig();

            const response = await fetch(`${this.bridgeUrl}/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                return {
                    connected: false,
                    error: 'Bridge did not respond.',
                    recommendedCommand: this.recommendedCommand,
                };
            }

            const data = await response.json();
            const connected = Boolean(
                data?.connected === true ||
                data?.bridge?.connected === true ||
                data?.status === 'CONNECTED' ||
                data?.status === 'RUNNING'
            );

            return { connected };
        } catch {
            return {
                connected: false,
                error: `Bridge offline at ${this.bridgeUrl}.`,
                recommendedCommand: this.recommendedCommand,
            };
        }
    }

    async sendText(telefone: string, mensagem: string): Promise<SendResult> {
        const phoneResult = normalizeOutboundPhoneBR(telefone);

        if (!phoneResult.isValid) {
            return {
                success: false,
                deliveryStatus: 'FAILED',
                error: phoneResult.error || 'Telefone invalido',
                timestamp: new Date(),
            };
        }

        if (phoneResult.type !== 'celular') {
            return {
                success: false,
                deliveryStatus: 'FAILED',
                error: 'WhatsApp requer numero de celular',
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        }

        try {
            this.refreshBridgeConfig();

            if (whatsappCircuitBreaker.isOpen()) {
                throw Object.assign(
                    new Error('WhatsApp circuit breaker is OPEN - bridge calls are suspended'),
                    { code: 'CIRCUIT_OPEN', circuitState: whatsappCircuitBreaker.toJSON() }
                );
            }

            await logger.whatsapp('whatsapp_sending', `Enviando para ${phoneResult.formatted}`, {
                telefone: phoneResult.e164,
                jid: phoneResult.jid,
            });

            const response = await fetch(`${this.bridgeUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: phoneResult.jid,
                    message: mensagem,
                }),
                signal: AbortSignal.timeout(30000),
            });

            const payload: any = await response.json().catch(() => ({}));
            const messageId = extractProviderMessageId(payload);

            if (response.ok && payload?.success && messageId) {
                whatsappCircuitBreaker.recordSuccess();

                await logger.whatsapp('whatsapp_sent', `Mensagem enviada para ${phoneResult.formatted}`, {
                    providerMessageId: messageId,
                    resolvedMessageId: messageId,
                    telefone: phoneResult.e164,
                    jid: phoneResult.jid,
                });

                return {
                    success: true,
                    deliveryStatus: 'SENT_CONFIRMED',
                    bridgeAccepted: true,
                    messageId,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            if (response.ok && payload?.success && !messageId) {
                whatsappCircuitBreaker.recordFailure(503);
                const error = 'Envio sem confirmacao: bridge retornou sucesso sem messageId.';

                await logger.warning('whatsapp_unconfirmed', error, {
                    telefone: phoneResult.e164,
                    jid: phoneResult.jid,
                    providerMessageId: null,
                    resolvedMessageId: null,
                    bridgePayload: payload,
                });

                return {
                    success: false,
                    deliveryStatus: 'UNCONFIRMED',
                    bridgeAccepted: true,
                    error,
                    errorCode: 'UNCONFIRMED_SEND',
                    recommendedCommand: this.recommendedCommand,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            if (response.status >= 500) {
                whatsappCircuitBreaker.recordFailure(response.status);
            }

            await logger.error('whatsapp_failed', `Falha: ${payload?.error || 'erro desconhecido'}`, undefined, {
                telefone: phoneResult.e164,
                jid: phoneResult.jid,
                bridgePayload: payload,
                httpStatus: response.status,
            });

            return {
                success: false,
                deliveryStatus: 'FAILED',
                bridgeAccepted: false,
                error: payload?.error || 'Falha no envio',
                errorCode: payload?.code || (response.status >= 500 ? 'BRIDGE_UNAVAILABLE' : 'PROVIDER_ERROR'),
                statusCode: response.status,
                recommendedCommand: this.recommendedCommand,
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            const errorCode = (error as any)?.code ? String((error as any).code) : undefined;
            if (errorCode !== 'CIRCUIT_OPEN') {
                whatsappCircuitBreaker.recordFailure();
            }

            if (errorCode === 'CIRCUIT_OPEN') {
                return {
                    success: false,
                    deliveryStatus: 'FAILED',
                    error: errorMsg,
                    errorCode,
                    circuitState: (error as any)?.circuitState || whatsappCircuitBreaker.toJSON(),
                    recommendedCommand: this.recommendedCommand,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    deliveryStatus: 'FAILED',
                    error: 'WhatsApp bridge is offline.',
                    errorCode: 'BRIDGE_UNAVAILABLE',
                    recommendedCommand: this.recommendedCommand,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            return {
                success: false,
                deliveryStatus: 'FAILED',
                error: errorMsg,
                errorCode: errorCode || 'INTERNAL_ERROR',
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        }
    }

    async enviarProposta(dados: {
        pacienteNome: string;
        pacienteTelefone: string;
        avaliacaoId: string;
        valorProposto?: string;
    }): Promise<SendResult> {
        const phoneResult = normalizeOutboundPhoneBR(dados.pacienteTelefone);

        if (!phoneResult.isValid) {
            return {
                success: false,
                deliveryStatus: 'FAILED',
                error: `Telefone invalido: ${phoneResult.error}`,
                timestamp: new Date(),
            };
        }

        const mensagem = buildAvaliacaoPropostaMessage({
            pacienteNome: dados.pacienteNome,
            avaliacaoId: dados.avaliacaoId,
            valorProposto: dados.valorProposto,
        });

        return this.sendText(dados.pacienteTelefone, mensagem);
    }
}

export const whatsappSender = new WhatsAppSenderService();
export default whatsappSender;

