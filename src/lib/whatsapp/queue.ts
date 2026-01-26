/**
 * WhatsApp Message Queue
 * Garante envio de mensagens mesmo com conexão instável
 * Armazena mensagens pendentes e reenvia quando a conexão estabiliza
 */

import fs from 'fs';
import path from 'path';

interface QueuedMessage {
    id: string;
    to: string;
    text: string;
    createdAt: string;
    attempts: number;
    lastAttempt?: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    error?: string;
}

const QUEUE_FILE = path.join(process.cwd(), '.wa-queue.json');
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 segundos

let messageQueue: QueuedMessage[] = [];
let isProcessing = false;

// Carregar fila do arquivo
export function loadQueue(): void {
    try {
        if (fs.existsSync(QUEUE_FILE)) {
            const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
            messageQueue = JSON.parse(data);
            console.log(`📦 [Queue] ${messageQueue.filter(m => m.status === 'PENDING').length} mensagens pendentes carregadas`);
        }
    } catch (_e) {
        console.error('[Queue] Erro ao carregar fila:', _e);
        messageQueue = [];
    }
}

// Salvar fila no arquivo
function saveQueue(): void {
    try {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(messageQueue, null, 2));
    } catch (_e) {
        console.error('[Queue] Erro ao salvar fila:', _e);
    }
}

// Adicionar mensagem à fila
export function addToQueue(to: string, text: string): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: QueuedMessage = {
        id,
        to,
        text,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: 'PENDING'
    };

    messageQueue.push(message);
    saveQueue();
    console.log(`📥 [Queue] Mensagem adicionada à fila: ${id} -> ${to}`);

    // Tentar processar imediatamente
    processQueue();

    return id;
}

// Processar fila de mensagens
export async function processQueue(): Promise<void> {
    if (isProcessing) {
        console.log('[Queue] Já está processando, ignorando...');
        return;
    }

    isProcessing = true;

    try {
        const pendingMessages = messageQueue.filter(m => m.status === 'PENDING');

        if (pendingMessages.length === 0) {
            isProcessing = false;
            return;
        }

        console.log(`📤 [Queue] Processando ${pendingMessages.length} mensagens pendentes...`);

        // Importar dinamicamente para evitar circular dependency
        const { getSocket } = await import('./client');
        const sock = getSocket();

        if (!sock) {
            console.log('⏳ [Queue] Socket não disponível, reagendando...');
            isProcessing = false;
            setTimeout(() => processQueue(), RETRY_DELAY);
            return;
        }

        for (const msg of pendingMessages) {
            try {
                msg.attempts++;
                msg.lastAttempt = new Date().toISOString();

                const jid = msg.to.includes('@') ? msg.to : `${msg.to}@s.whatsapp.net`;

                await sock.sendMessage(jid, { text: msg.text });

                msg.status = 'SENT';
                console.log(`✅ [Queue] Mensagem enviada: ${msg.id}`);

            } catch (error: any) {
                console.error(`❌ [Queue] Erro ao enviar ${msg.id}:`, error.message);
                msg.error = error.message;

                if (msg.attempts >= MAX_RETRIES) {
                    msg.status = 'FAILED';
                    console.log(`⛔ [Queue] Mensagem ${msg.id} falhou após ${MAX_RETRIES} tentativas`);
                }
            }

            saveQueue();

            // Pequeno delay entre mensagens para evitar rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        // Verificar se ainda há pendentes
        const stillPending = messageQueue.filter(m => m.status === 'PENDING');
        if (stillPending.length > 0) {
            console.log(`⏳ [Queue] ${stillPending.length} mensagens ainda pendentes, reagendando...`);
            setTimeout(() => processQueue(), RETRY_DELAY);
        }

    } catch (_e) {
        console.error('[Queue] Erro ao processar fila:', _e);
    }

    isProcessing = false;
}

// Obter status da fila
export function getQueueStatus(): { pending: number; sent: number; failed: number; messages: QueuedMessage[] } {
    return {
        pending: messageQueue.filter(m => m.status === 'PENDING').length,
        sent: messageQueue.filter(m => m.status === 'SENT').length,
        failed: messageQueue.filter(m => m.status === 'FAILED').length,
        messages: messageQueue.slice(-20) // Últimas 20 mensagens
    };
}

// Limpar mensagens antigas (mais de 24h)
export function cleanOldMessages(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const before = messageQueue.length;

    messageQueue = messageQueue.filter(m => {
        const createdAt = new Date(m.createdAt).getTime();
        return createdAt > oneDayAgo || m.status === 'PENDING';
    });

    if (messageQueue.length !== before) {
        saveQueue();
        console.log(`🗑️ [Queue] Removidas ${before - messageQueue.length} mensagens antigas`);
    }
}

// Inicializar queue
loadQueue();
