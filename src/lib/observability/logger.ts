import pino from 'pino';
import { prisma } from '@/lib/prisma';
import { RequestContext } from './request-context';

export type LogType = 'ERROR' | 'INFO' | 'WARNING' | 'WHATSAPP' | 'DEBUG';

export interface LogParams {
    type: LogType;
    action: string;
    message: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    role?: string;
    stack?: string;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
}

const PINO_LEVEL_MAP: Record<LogType, string> = {
    ERROR: 'error',
    WARNING: 'warn',
    INFO: 'info',
    WHATSAPP: 'info',
    DEBUG: 'debug',
};

const pinoLogger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
        : undefined,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
    base: {
        service: 'madef',
        env: process.env.NODE_ENV || 'development',
    },
});

function enrichWithContext(metadata?: Record<string, unknown>): Record<string, unknown> {
    const context = RequestContext.get();
    const requestId = RequestContext.getRequestId();
    const durationMs = RequestContext.getDurationMs();

    return {
        ...(metadata || {}),
        requestId: requestId || undefined,
        route: context?.route || undefined,
        role: context?.role || undefined,
        durationMs: durationMs || undefined,
    };
}

export async function logEvent(params: LogParams): Promise<void> {
    try {
        const context = RequestContext.get();
        const enriched = enrichWithContext(params.metadata);
        const duration = params.duration ?? RequestContext.getDurationMs();
        const userId = params.userId || context?.userId || null;
        const role = params.role || context?.role || undefined;

        const pinoLevel = PINO_LEVEL_MAP[params.type] || 'info';
        const child = pinoLogger.child({
            action: params.action,
            logType: params.type,
            ...enriched,
        });
        child[pinoLevel as 'info'](params.stack ? { stack: params.stack } : {}, params.message);

        await prisma.systemLog.create({
            data: {
                type: params.type,
                action: params.action,
                message: params.message,
                metadata: JSON.stringify({
                    ...enriched,
                    role,
                }),
                stack: params.stack || null,
                userId,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
                duration,
            },
        });
    } catch (error) {
        pinoLogger.error({ err: error }, '[LOGGER_CRITICAL] failed to persist structured log');
    }
}

function normalizeErrorArgs(
    errorOrMetadata?: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
): { stack?: string; metadata?: Record<string, unknown> } {
    if (errorOrMetadata instanceof Error) {
        return {
            stack: errorOrMetadata.stack,
            metadata: {
                ...(metadata || {}),
                errorName: errorOrMetadata.name,
                errorMessage: errorOrMetadata.message,
            },
        };
    }

    if (errorOrMetadata && typeof errorOrMetadata === 'object') {
        return {
            metadata: {
                ...errorOrMetadata,
                ...(metadata || {}),
            },
        };
    }

    return { metadata };
}

const logger = {
    info(action: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        return logEvent({ type: 'INFO', action, message, metadata });
    },

    warning(action: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        return logEvent({ type: 'WARNING', action, message, metadata });
    },

    whatsapp(action: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        return logEvent({ type: 'WHATSAPP', action, message, metadata });
    },

    debug(action: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
        return logEvent({ type: 'DEBUG', action, message, metadata });
    },

    error(
        action: string,
        message: string,
        errorOrMetadata?: Error | Record<string, unknown>,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        const normalized = normalizeErrorArgs(errorOrMetadata, metadata);
        return logEvent({
            type: 'ERROR',
            action,
            message,
            stack: normalized.stack,
            metadata: normalized.metadata,
        });
    },

    /** Access the underlying Pino instance for advanced usage */
    pino: pinoLogger,
};

export default logger;
