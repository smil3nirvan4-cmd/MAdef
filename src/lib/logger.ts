import { prisma } from './db';

export type LogType = 'ERROR' | 'INFO' | 'WARNING' | 'WHATSAPP' | 'DEBUG';

export interface LogParams {
    type: LogType;
    action: string;
    message: string;
    metadata?: Record<string, any>;
    userId?: string;
    stack?: string;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
}

export async function logEvent(params: LogParams): Promise<void> {
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${params.type}] [${params.action}]`;

    // Console log sempre (dev + prod)
    if (params.type === 'ERROR') {
        console.error(`${logPrefix} ${params.message}`, params.metadata || '');
        if (params.stack) console.error(params.stack);
    } else {
        console.log(`${logPrefix} ${params.message}`, params.metadata || '');
    }

    // Persistir no banco
    try {
        await prisma.systemLog.create({
            data: {
                type: params.type,
                action: params.action,
                message: params.message,
                metadata: params.metadata ? JSON.stringify(params.metadata) : null,
                stack: params.stack || null,
                userId: params.userId || null,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
                duration: params.duration || null,
            },
        });
    } catch (error) {
        // Fallback: não quebrar a aplicação se log falhar
        console.error('[LOGGER_CRITICAL] Falha ao persistir log:', error);
    }
}

// Helpers para uso rápido
export const logger = {
    info: (action: string, message: string, metadata?: Record<string, any>) =>
        logEvent({ type: 'INFO', action, message, metadata }),

    error: (action: string, message: string, error?: Error, metadata?: Record<string, any>) =>
        logEvent({
            type: 'ERROR',
            action,
            message,
            stack: error?.stack,
            metadata: { ...metadata, errorName: error?.name, errorMessage: error?.message }
        }),

    warning: (action: string, message: string, metadata?: Record<string, any>) =>
        logEvent({ type: 'WARNING', action, message, metadata }),

    whatsapp: (action: string, message: string, metadata?: Record<string, any>) =>
        logEvent({ type: 'WHATSAPP', action, message, metadata }),

    debug: (action: string, message: string, metadata?: Record<string, any>) =>
        logEvent({ type: 'DEBUG', action, message, metadata }),
};

export default logger;
