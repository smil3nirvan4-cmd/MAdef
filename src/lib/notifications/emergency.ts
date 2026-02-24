import logger from '@/lib/observability/logger';

interface EmergencyNotificationData {
    telefone: string;
    timestamp: Date;
    mensagem?: string;
}

async function sendSlackNotification(data: EmergencyNotificationData): Promise<boolean> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `🚨 *EMERGÊNCIA MÉDICA* 🚨`,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*ALERTA DE EMERGÊNCIA MÉDICA*\n\nUm usuário reportou uma emergência médica via WhatsApp.\n\n*Telefone:* ${data.telefone}\n*Horário:* ${data.timestamp.toLocaleString('pt-BR')}\n\n⚠️ O usuário foi orientado a ligar para o 192 (SAMU).`
                        }
                    }
                ]
            })
        });
        return response.ok;
    } catch (error) {
        logger.error('emergency.slack', 'Erro ao enviar notificacao Slack', error instanceof Error ? error : { error }, { module: 'emergency' });
        return false;
    }
}

async function sendTelegramNotification(data: EmergencyNotificationData): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return false;

    try {
        const message = `🚨 *EMERGÊNCIA MÉDICA* 🚨

Um usuário reportou uma emergência médica via WhatsApp.

📞 *Telefone:* ${data.telefone}
🕐 *Horário:* ${data.timestamp.toLocaleString('pt-BR')}

⚠️ O usuário foi orientado a ligar para o 192 (SAMU).`;

        const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            }
        );
        return response.ok;
    } catch (error) {
        logger.error('emergency.telegram', 'Erro ao enviar notificacao Telegram', error instanceof Error ? error : { error }, { module: 'emergency' });
        return false;
    }
}

async function sendEmailNotification(data: EmergencyNotificationData): Promise<boolean> {
    const emergencyEmail = process.env.EMERGENCY_NOTIFICATION_EMAIL;
    if (!emergencyEmail) return false;

    logger.info('emergency.email', `Notificacao de emergencia para ${emergencyEmail}`, { module: 'emergency', telefone: data.telefone, timestamp: data.timestamp.toISOString() });

    return true;
}

export async function notifyEmergencyTeam(telefone: string): Promise<void> {
    const data: EmergencyNotificationData = {
        telefone,
        timestamp: new Date()
    };

    logger.info('emergency.notify', 'Notificando equipe sobre emergencia medica', { module: 'emergency', telefone: data.telefone, timestamp: data.timestamp.toISOString() });

    const results = await Promise.allSettled([
        sendSlackNotification(data),
        sendTelegramNotification(data),
        sendEmailNotification(data)
    ]);

    const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value === true
    ).length;

    if (successCount === 0) {
        logger.warning('emergency.notify', 'Nenhum canal de notificacao configurado ou disponivel', { module: 'emergency' });
    } else {
        logger.info('emergency.notify', `Notificacao enviada para ${successCount} canal(is)`, { module: 'emergency', successCount });
    }
}

export async function notifyAdminHelp(telefone: string): Promise<void> {
    logger.info('admin.help', `Usuario ${telefone} solicitou falar com atendente`, { module: 'emergency', telefone });

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: `📞 *Solicitação de Atendimento*\n\nUsuário solicitou falar com atendente.\n*Telefone:* ${telefone}\n*Horário:* ${new Date().toLocaleString('pt-BR')}`
                })
            });
        } catch (error) {
            logger.error('admin.help', 'Erro ao notificar admin', error instanceof Error ? error : { error }, { module: 'emergency' });
        }
    }
}
