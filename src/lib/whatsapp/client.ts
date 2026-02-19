import { resolveBridgeConfig } from './bridge-config';

// Import logMessage for tracking sent messages
let logMessage: ((params: { telefone: string; direcao: 'IN' | 'OUT'; conteudo: string; flow?: string; step?: string }) => Promise<void>) | null = null;
import('@/lib/database').then(db => { logMessage = db.logMessage; }).catch(() => { });

function getBridgeUrl() {
    return resolveBridgeConfig().bridgeUrl;
}

/**
 * Envia mensagem via Bridge (Processo externo)
 */
export async function sendMessage(to: string, text: string): Promise<{ success: boolean; error?: string }> {
    const bridgeUrl = getBridgeUrl();
    const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

    console.log(`📤 [Bridge] Enviando para ${jid}: ${text.substring(0, 50)}...`);

    try {
        const res = await fetch(`${bridgeUrl}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: jid, message: text }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro no Bridge');
        }

        const data = await res.json();

        // Log mensagem enviada para histórico
        if (logMessage) {
            await logMessage({
                telefone: jid,
                direcao: 'OUT',
                conteudo: text.substring(0, 500), // Limitar tamanho
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error('❌ [Bridge] Erro ao enviar:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Fallback para botões: Envia como texto formatado
 */
export async function sendButtons(
    to: string,
    text: string,
    buttons: { id: string; text: string; payload?: string }[],
    footer?: string
): Promise<{ success: boolean; error?: string }> {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
    const formattedButtons = buttons.map((b, i) => `${emojis[i] || '•'} ${b.text}`).join('\n');
    const fullText = `${text}\n\n${formattedButtons}${footer ? `\n\n_${footer}_` : ''}`;

    return sendMessage(to, fullText);
}

/**
 * Fallback para listas: Envia como texto formatado
 */
export async function sendList(
    to: string,
    text: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
    footer?: string
): Promise<{ success: boolean; error?: string }> {
    let fullText = `${text}\n`;

    sections.forEach(s => {
        fullText += `\n*${s.title}*\n`;
        s.rows.forEach((r, i) => {
            fullText += `${i + 1}. ${r.title}${r.description ? ` - ${r.description}` : ''}\n`;
        });
    });

    if (footer) fullText += `\n_${footer}_`;

    return sendMessage(to, fullText);
}

/**
 * Fallback para Template Buttons
 */
export async function sendTemplateButtons(
    to: string,
    text: string,
    templateButtons: { type: 'url' | 'call' | 'quickReply'; text: string; url?: string; phoneNumber?: string; id?: string }[],
    footer?: string
): Promise<{ success: boolean; error?: string }> {
    const formatted = templateButtons.map((b, i) => {
        if (b.type === 'url') return `🔗 ${b.text}: ${b.url}`;
        if (b.type === 'call') return `📞 ${b.text}: ${b.phoneNumber}`;
        return `• ${b.text}`;
    }).join('\n');

    const fullText = `${text}\n\n${formatted}${footer ? `\n\n_${footer}_` : ''}`;
    return sendMessage(to, fullText);
}

// Deprecated: No-op for direct socket access
export function getSocket() {
    return null;
}

// Inicialização dummy para compatibilidade
export async function initializeWhatsApp() {
    console.log('ℹ️ Cliente rodando em modo Bridge (Stateless). Nenhuma ação necessária.');
    return null;
}
