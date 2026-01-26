// ============================================
// SERVIÇO DE ENVIO WHATSAPP
// ============================================

import { readFileSync, existsSync } from 'fs';
import { validateBrazilianPhone } from './phone-validator';
import logger from './logger';

interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp: Date;
    phoneFormatted?: string;
}

class WhatsAppSenderService {
    private bridgeUrl: string = '';

    constructor() {
        this.detectBridgePort();
    }

    private detectBridgePort(): void {
        const portFile = '.wa-bridge-port';

        if (existsSync(portFile)) {
            try {
                const port = readFileSync(portFile, 'utf-8').trim();
                this.bridgeUrl = `http://localhost:${port}`;
            } catch {
                this.bridgeUrl = 'http://localhost:4000';
            }
        } else {
            this.bridgeUrl = 'http://localhost:4000';
        }
    }

    async checkConnection(): Promise<{ connected: boolean; error?: string }> {
        try {
            this.detectBridgePort();

            const response = await fetch(`${this.bridgeUrl}/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                return { connected: false, error: 'Bridge não respondeu' };
            }

            const data = await response.json();
            return { connected: data.connected || data.status === 'RUNNING' };
        } catch (error) {
            return {
                connected: false,
                error: `Bridge offline em ${this.bridgeUrl}. Execute: npm run whatsapp`
            };
        }
    }

    async sendText(telefone: string, mensagem: string): Promise<SendResult> {
        const phoneResult = validateBrazilianPhone(telefone);

        if (!phoneResult.isValid) {
            return {
                success: false,
                error: phoneResult.error || 'Telefone inválido',
                timestamp: new Date(),
            };
        }

        if (phoneResult.type !== 'celular') {
            return {
                success: false,
                error: 'WhatsApp requer número de celular',
                timestamp: new Date(),
                phoneFormatted: phoneResult.formatted,
            };
        }

        try {
            this.detectBridgePort();

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

            const result = await response.json();

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
            } else {
                await logger.error('whatsapp_failed', `Falha: ${result.error}`, undefined, {
                    telefone: phoneResult.formatted,
                });

                return {
                    success: false,
                    error: result.error || 'Falha no envio',
                    timestamp: new Date(),
                    phoneFormatted: phoneResult.formatted,
                };
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

            if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
                return {
                    success: false,
                    error: `Bridge WhatsApp offline. Execute: npm run whatsapp`,
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
                error: `Telefone inválido: ${phoneResult.error}`,
                timestamp: new Date(),
            };
        }

        const codigoAvaliacao = dados.avaliacaoId.slice(-8).toUpperCase();

        const mensagem = `
🏥 *Mãos Amigas - Home Care*

Olá *${dados.pacienteNome}*! 👋

Sua avaliação foi concluída com sucesso! ✅

📋 *Código:* ${codigoAvaliacao}
${dados.valorProposto ? `💰 *Valor da Proposta:* ${dados.valorProposto}` : ''}

Em caso de dúvidas, responda esta mensagem.

_Equipe Mãos Amigas_ 🤝
    `.trim();

        return this.sendText(dados.pacienteTelefone, mensagem);
    }
}

export const whatsappSender = new WhatsAppSenderService();
export default whatsappSender;
