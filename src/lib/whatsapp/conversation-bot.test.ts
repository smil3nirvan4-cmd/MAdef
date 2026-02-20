import { beforeEach, describe, expect, it, vi } from 'vitest';

type SessionRecord = {
    state: string;
    data: string | null;
    lastActivity: Date | null;
    expiresAt: Date | null;
    updatedAt: Date;
};

const sessions = new Map<string, SessionRecord>();
const pacientes = new Map<string, any>();
const formSubmissions: any[] = [];
const systemLogs: any[] = [];
const incomingMessages: any[] = [];
const sentMessages: Array<{ to: string; text: string }> = [];

let legacyFlow: string | null = null;

function mergeDefined(base: Record<string, any>, patch: Record<string, any>) {
    const next = { ...base };
    Object.entries(patch).forEach(([key, value]) => {
        if (value !== undefined) {
            next[key] = value;
        }
    });
    return next;
}

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsAppSession: {
            findUnique: vi.fn(async ({ where }: { where: { phone: string } }) => sessions.get(where.phone) || null),
            upsert: vi.fn(
                async ({
                    where,
                    update,
                    create,
                }: {
                    where: { phone: string };
                    update: Record<string, any>;
                    create: Record<string, any>;
                }) => {
                    const current = sessions.get(where.phone);
                    const now = new Date();
                    const next: SessionRecord = current
                        ? {
                            ...current,
                            ...update,
                            updatedAt: now,
                        }
                        : {
                            state: create.state,
                            data: create.data,
                            lastActivity: create.lastActivity || now,
                            expiresAt: create.expiresAt || null,
                            updatedAt: now,
                        };
                    sessions.set(where.phone, next);
                    return next;
                }
            ),
        },
        mensagem: {
            create: vi.fn(async ({ data }: { data: any }) => {
                incomingMessages.push(data);
                return data;
            }),
        },
        paciente: {
            findUnique: vi.fn(async ({ where, select }: { where: { telefone: string }; select?: any }) => {
                const item = pacientes.get(where.telefone) || null;
                if (!item) return null;
                if (select?.status) return { status: item.status };
                return item;
            }),
            upsert: vi.fn(
                async ({
                    where,
                    update,
                    create,
                }: {
                    where: { telefone: string };
                    update: Record<string, any>;
                    create: Record<string, any>;
                }) => {
                    const current = pacientes.get(where.telefone);
                    const next = current
                        ? mergeDefined(current, update)
                        : { ...create };
                    pacientes.set(where.telefone, next);
                    return next;
                }
            ),
        },
        formSubmission: {
            create: vi.fn(async ({ data }: { data: any }) => {
                formSubmissions.push(data);
                return data;
            }),
        },
        systemLog: {
            create: vi.fn(async ({ data }: { data: any }) => {
                systemLogs.push(data);
                return data;
            }),
        },
    },
}));

vi.mock('@/lib/whatsapp/client', () => ({
    sendMessage: vi.fn(async (to: string, text: string) => {
        sentMessages.push({ to, text });
        return { success: true };
    }),
}));

vi.mock('@/lib/whatsapp/state-manager', () => ({
    getUserState: vi.fn(async () => {
        if (!legacyFlow) return null;
        return {
            currentFlow: legacyFlow,
            currentStep: 'ANY',
            data: {},
            lastInteraction: new Date(),
            phone: '5511999990000',
        };
    }),
}));

vi.mock('@/lib/notifications/emergency', () => ({
    notifyAdminHelp: vi.fn(async () => undefined),
}));

import { handleConversationMessage } from './conversation-bot';

function buildPayload(text: string, phone = '5511999990000') {
    return {
        key: {
            remoteJid: `${phone}@s.whatsapp.net`,
            fromMe: false,
        },
        message: {
            conversation: text,
        },
    };
}

describe('conversation-bot', () => {
    beforeEach(() => {
        sessions.clear();
        pacientes.clear();
        formSubmissions.length = 0;
        systemLogs.length = 0;
        incomingMessages.length = 0;
        sentMessages.length = 0;
        legacyFlow = null;
    });

    it('keeps budget progression when care option is selected with "1"', async () => {
        const phone = '5511999990000';
        sessions.set(phone, {
            state: 'ORCAMENTO_TIPO_CUIDADO',
            data: JSON.stringify({
                nomeResponsavel: 'Carlos Souza',
                nomePaciente: 'Ana Souza',
                idadePaciente: 81,
            }),
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            updatedAt: new Date(),
        });

        const handled = await handleConversationMessage(buildPayload('1', phone));

        expect(handled).toBe(true);
        expect(sentMessages[sentMessages.length - 1]?.text).toContain('Qual o nivel de urgencia?');
        expect(sentMessages[sentMessages.length - 1]?.text).not.toContain('Nossos Servicos');
        expect(sessions.get(phone)?.state).toBe('ORCAMENTO_URGENCIA');
    });

    it('creates and updates lead draft during registration flow', async () => {
        const phone = '5511988877665';

        await handleConversationMessage(buildPayload('oi', phone));
        await handleConversationMessage(buildPayload('2', phone));
        await handleConversationMessage(buildPayload('Marcos Pereira', phone));
        await handleConversationMessage(buildPayload('Patrick Campos', phone));

        const lead = pacientes.get(phone);
        expect(lead).toBeTruthy();
        expect(lead.status).toBe('LEAD');
        expect(lead.nome).toBe('Patrick Campos');
    });

    it('does not intercept active legacy flow without explicit conversation intent', async () => {
        legacyFlow = 'AGUARDANDO_CONTRATO';

        const handled = await handleConversationMessage(buildPayload('sim', '551191112222'));

        expect(handled).toBe(false);
        expect(sentMessages.length).toBe(0);
    });
});
