// ============================================
// SERVICO DE ENVIO WHATSAPP
// ============================================

import { validateBrazilianPhone } from './phone-validator';
import logger from './logger';
import { resolveBridgeConfig } from './whatsapp/bridge-config';

interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
    recommendedCommand?: string;
    timestamp: Date;
    phoneFormatted?: string;
}

class WhatsAppSenderService {
    private bridgeUrl: string = '';
    private recommendedCommand: string = 'npm run dev';

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
            return { connected: data.connected || data.status === 'RUNNING' };
        } catch {
            return {
                connected: false,
                error: `Bridge offline at ${this.bridgeUrl}.`,
                recommendedCommand: this.recommendedCommand,
            };
        }
    }

    async sendText(telefone: string, mensagem: string): Promise<SendResult> {
        const phoneResult = validateBrazilianPhone(telefone);

        if (!phoneResult.isValid) {
            return {
                success: false,
                error: phoneResult.error || 'Telefone invalido',
                timestamp: new Date(),
            };
        }

        if (phoneResult.type !== 'celular') {
            return {
                success: false,
                error: 'WhatsApp requer numero de celular',
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        }

        try {
            this.refreshBridgeConfig();

            await logger.whatsapp('whatsapp_sending', `Enviando para ${phoneResult.formatted}`, {
                telefone: phoneResult.whatsapp,
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

            const result = await response.json().catch(() => ({}));

            if (response.ok && result.success) {
                await logger.whatsapp('whatsapp_sent', `Mensagem enviada para ${phoneResult.formatted}`, {
                    messageId: result.messageId,
                });

                return {
                    success: true,
                    messageId: result.messageId,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            await logger.error('whatsapp_failed', `Falha: ${result.error || 'erro desconhecido'}`, undefined, {
                telefone: phoneResult.formatted,
            });

            return {
                success: false,
                error: result.error || 'Falha no envio',
                recommendedCommand: this.recommendedCommand,
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

            if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: 'WhatsApp bridge is offline.',
                    recommendedCommand: this.recommendedCommand,
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }

            return {
                success: false,
                error: errorMsg,
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
        const phoneResult = validateBrazilianPhone(dados.pacienteTelefone);

        if (!phoneResult.isValid) {
            return {
                success: false,
                error: `Telefone invalido: ${phoneResult.error}`,
                timestamp: new Date(),
            };
        }

        const codigoAvaliacao = dados.avaliacaoId.slice(-8).toUpperCase();

        const mensagem = `
*Maos Amigas - Home Care*

Ola *${dados.pacienteNome}*!

Sua avaliacao foi concluida com sucesso!

*Codigo:* ${codigoAvaliacao}
${dados.valorProposto ? `*Valor da Proposta:* ${dados.valorProposto}` : ''}

Em caso de duvidas, responda esta mensagem.

_Equipe Maos Amigas_
    `.trim();

        return this.sendText(dados.pacienteTelefone, mensagem);
    }
}

export const whatsappSender = new WhatsAppSenderService();
export default whatsappSender;
