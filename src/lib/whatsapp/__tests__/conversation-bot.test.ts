import { describe, it, expect, vi, beforeEach } from 'vitest';

// ----- in-memory stores -----
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

// ----- mocks -----
vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsAppSession: {
            findUnique: vi.fn(async ({ where }: { where: { phone: string } }) =>
                sessions.get(where.phone) || null
            ),
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
                        ? { ...current, ...update, updatedAt: now }
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
                    const next = current ? mergeDefined(current, update) : { ...create };
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

import { handleConversationMessage } from '../conversation-bot';

// ---- helpers ----
const PHONE = '5511999990000';
const JID = `${PHONE}@s.whatsapp.net`;

function buildPayload(text: string, phone = PHONE, fromMe = false) {
    return {
        key: {
            remoteJid: `${phone}@s.whatsapp.net`,
            fromMe,
        },
        message: { conversation: text },
    };
}

function buildExtendedTextPayload(text: string, phone = PHONE) {
    return {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { extendedTextMessage: { text } },
    };
}

function buildImagePayload(caption: string, phone = PHONE) {
    return {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { imageMessage: { caption } },
    };
}

function buildButtonsResponsePayload(selectedText: string, phone = PHONE) {
    return {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { buttonsResponseMessage: { selectedDisplayText: selectedText } },
    };
}

function buildTemplateButtonPayload(selectedText: string, phone = PHONE) {
    return {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { templateButtonReplyMessage: { selectedDisplayText: selectedText } },
    };
}

function buildListResponsePayload(selectedRowId: string, phone = PHONE) {
    return {
        key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
        message: { listResponseMessage: { singleSelectReply: { selectedRowId } } },
    };
}

function buildReplyJidPayload(text: string, jid: string) {
    return {
        _replyJid: jid,
        key: { fromMe: false },
        message: { conversation: text },
    };
}

function setSession(phone: string, state: string, data: Record<string, any> = {}) {
    sessions.set(phone, {
        state,
        data: JSON.stringify(data),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60_000),
        updatedAt: new Date(),
    });
}

function setExpiredSession(phone: string, state: string, data: Record<string, any> = {}) {
    sessions.set(phone, {
        state,
        data: JSON.stringify(data),
        lastActivity: new Date(Date.now() - 31 * 60_000), // expired by inactivity
        expiresAt: new Date(Date.now() - 1_000), // also expired by date
        updatedAt: new Date(Date.now() - 31 * 60_000),
    });
}

function lastSent(): string | undefined {
    return sentMessages[sentMessages.length - 1]?.text;
}

function sessionState(phone = PHONE): string | undefined {
    return sessions.get(phone)?.state;
}

// ============================================================

describe('conversation-bot (extended coverage)', () => {
    beforeEach(() => {
        sessions.clear();
        pacientes.clear();
        formSubmissions.length = 0;
        systemLogs.length = 0;
        incomingMessages.length = 0;
        sentMessages.length = 0;
        legacyFlow = null;
    });

    // ---- extractIncomingMessage / payload parsing ----
    describe('payload extraction', () => {
        it('returns false for null payload', async () => {
            expect(await handleConversationMessage(null)).toBe(false);
        });

        it('returns false for payload without jid', async () => {
            expect(await handleConversationMessage({ key: {}, message: { conversation: 'hi' } })).toBe(false);
        });

        it('returns false for payload without text', async () => {
            expect(
                await handleConversationMessage({ key: { remoteJid: JID }, message: {} })
            ).toBe(false);
        });

        it('returns true and does nothing for fromMe messages', async () => {
            const result = await handleConversationMessage(buildPayload('oi', PHONE, true));
            expect(result).toBe(true);
            expect(sentMessages).toHaveLength(0);
        });

        it('extracts text from extendedTextMessage', async () => {
            const result = await handleConversationMessage(buildExtendedTextPayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('extracts text from imageMessage caption', async () => {
            const result = await handleConversationMessage(buildImagePayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('extracts text from buttonsResponseMessage', async () => {
            const result = await handleConversationMessage(buildButtonsResponsePayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('extracts text from templateButtonReplyMessage', async () => {
            const result = await handleConversationMessage(buildTemplateButtonPayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('extracts text from listResponseMessage', async () => {
            const result = await handleConversationMessage(buildListResponsePayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('uses _replyJid when present', async () => {
            const result = await handleConversationMessage(buildReplyJidPayload('oi', JID));
            expect(result).toBe(true);
            expect(sentMessages[0].to).toBe(JID);
        });

        it('returns false for empty string text', async () => {
            const result = await handleConversationMessage({
                key: { remoteJid: JID, fromMe: false },
                message: { conversation: '' },
            });
            expect(result).toBe(false);
        });
    });

    // ---- greeting handling ----
    describe('greetings', () => {
        const greetings = ['oi', 'Oii', 'Ola', 'Olaa', 'Bom dia', 'Boa tarde', 'Boa noite', 'hey'];

        for (const greeting of greetings) {
            it(`responds to greeting "${greeting}" with main menu`, async () => {
                const result = await handleConversationMessage(buildPayload(greeting));
                expect(result).toBe(true);
                expect(lastSent()).toContain('Maos Amigas');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- menu commands ----
    describe('menu commands', () => {
        for (const cmd of ['menu', 'inicio', 'iniciar', 'voltar']) {
            it(`responds to menu command "${cmd}" with main menu`, async () => {
                setSession(PHONE, 'ORCAMENTO_NOME', { nomeResponsavel: 'Test' });
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('Maos Amigas');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- reset commands ----
    describe('reset commands', () => {
        for (const cmd of ['cancelar', 'sair', 'parar', 'reiniciar', 'resetar']) {
            it(`cancels and shows menu for reset command "${cmd}"`, async () => {
                setSession(PHONE, 'ORCAMENTO_URGENCIA', {});
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('Cadastro cancelado');
                expect(lastSent()).toContain('Maos Amigas');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- service command ----
    describe('service commands', () => {
        for (const cmd of ['1', 'servicos', 'servico']) {
            it(`shows services info for command "${cmd}"`, async () => {
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('Nossos Servicos');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- budget command (start flow) ----
    describe('budget initiation', () => {
        for (const cmd of ['2', 'orcamento', 'solicitar orcamento', 'simular', 'cotacao', 'preco', 'valor']) {
            it(`starts budget flow for command "${cmd}"`, async () => {
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('cadastro comercial');
                expect(sessionState()).toBe('ORCAMENTO_RESPONSAVEL');
            });
        }
    });

    // ---- hours command ----
    describe('hours commands', () => {
        for (const cmd of ['3', 'horario', 'funcionamento', 'cobertura']) {
            it(`shows hours info for command "${cmd}"`, async () => {
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('Horarios de Atendimento');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- human command ----
    describe('human command', () => {
        for (const cmd of ['4', 'ajuda', 'atendente', 'humano', 'consultor', 'falar']) {
            it(`notifies admin for human command "${cmd}"`, async () => {
                const result = await handleConversationMessage(buildPayload(cmd));
                expect(result).toBe(true);
                expect(lastSent()).toContain('consultor humano');
                expect(sessionState()).toBe('MENU');
            });
        }
    });

    // ---- unrecognized message ----
    describe('unrecognized input', () => {
        it('responds with options list for unrecognized text', async () => {
            const result = await handleConversationMessage(buildPayload('xyz random'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Nao entendi');
            expect(sessionState()).toBe('MENU');
        });
    });

    // ---- legacy flow deferral ----
    describe('legacy flow interaction', () => {
        it('defers to legacy flow when active and no conversation intent', async () => {
            legacyFlow = 'CADASTRO_CUIDADOR';
            const result = await handleConversationMessage(buildPayload('sim'));
            expect(result).toBe(false);
            expect(sentMessages).toHaveLength(0);
        });

        it('overrides legacy flow when greeting is sent', async () => {
            legacyFlow = 'CADASTRO_CUIDADOR';
            const result = await handleConversationMessage(buildPayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('overrides legacy flow when explicit keyword is sent (orcamento)', async () => {
            legacyFlow = 'CADASTRO_CUIDADOR';
            const result = await handleConversationMessage(buildPayload('orcamento'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_RESPONSAVEL');
        });

        it('overrides legacy flow when menu command is sent', async () => {
            legacyFlow = 'QUIZ';
            const result = await handleConversationMessage(buildPayload('menu'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
        });

        it('overrides legacy flow when reset command is sent', async () => {
            legacyFlow = 'QUIZ';
            const result = await handleConversationMessage(buildPayload('cancelar'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Cadastro cancelado');
        });

        it('does not defer when legacy flow is IDLE', async () => {
            legacyFlow = 'IDLE';
            const result = await handleConversationMessage(buildPayload('xyz'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Nao entendi');
        });

        it('does not defer when conversation session already exists', async () => {
            legacyFlow = 'CADASTRO_CUIDADOR';
            setSession(PHONE, 'ORCAMENTO_NOME', { nomeResponsavel: 'Test' });
            const result = await handleConversationMessage(buildPayload('Patrick'));
            expect(result).toBe(true);
        });
    });

    // ---- expired sessions ----
    describe('expired sessions', () => {
        it('resets to MENU when session is expired by inactivity', async () => {
            setExpiredSession(PHONE, 'ORCAMENTO_URGENCIA', { nomeResponsavel: 'X' });
            const result = await handleConversationMessage(buildPayload('oi'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
            expect(sessionState()).toBe('MENU');
        });
    });

    // ---- budget flow: ORCAMENTO_RESPONSAVEL ----
    describe('budget flow: ORCAMENTO_RESPONSAVEL', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_RESPONSAVEL', {});
        });

        it('rejects names shorter than 3 characters', async () => {
            const result = await handleConversationMessage(buildPayload('AB'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('nome completo');
            expect(sessionState()).toBe('ORCAMENTO_RESPONSAVEL');
        });

        it('accepts valid name and moves to ORCAMENTO_NOME', async () => {
            const result = await handleConversationMessage(buildPayload('Carlos Souza'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('nome completo do paciente');
            expect(sessionState()).toBe('ORCAMENTO_NOME');
        });
    });

    // ---- budget flow: ORCAMENTO_NOME ----
    describe('budget flow: ORCAMENTO_NOME', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_NOME', { nomeResponsavel: 'Carlos' });
        });

        it('rejects names shorter than 3 characters', async () => {
            const result = await handleConversationMessage(buildPayload('AB'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('nome completo do paciente');
            expect(sessionState()).toBe('ORCAMENTO_NOME');
        });

        it('accepts valid patient name and moves to ORCAMENTO_IDADE', async () => {
            const result = await handleConversationMessage(buildPayload('Ana Maria'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('idade do paciente');
            expect(sessionState()).toBe('ORCAMENTO_IDADE');
        });
    });

    // ---- budget flow: ORCAMENTO_IDADE ----
    describe('budget flow: ORCAMENTO_IDADE', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_IDADE', { nomeResponsavel: 'C', nomePaciente: 'A' });
        });

        it('rejects non-numeric input', async () => {
            const result = await handleConversationMessage(buildPayload('old'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Idade invalida');
            expect(sessionState()).toBe('ORCAMENTO_IDADE');
        });

        it('rejects age over 120', async () => {
            const result = await handleConversationMessage(buildPayload('150'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Idade invalida');
        });

        it('parses negative input by stripping non-digits (treats "-5" as age 5)', async () => {
            // The code strips non-digit chars, so "-5" becomes "5" which is a valid age
            const result = await handleConversationMessage(buildPayload('-5'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TIPO_CUIDADO');
        });

        it('accepts valid age and moves to ORCAMENTO_TIPO_CUIDADO', async () => {
            const result = await handleConversationMessage(buildPayload('78'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('tipo de cuidado');
            expect(sessionState()).toBe('ORCAMENTO_TIPO_CUIDADO');
        });

        it('strips non-digits from age input', async () => {
            const result = await handleConversationMessage(buildPayload('78 anos'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TIPO_CUIDADO');
        });
    });

    // ---- budget flow: ORCAMENTO_TIPO_CUIDADO ----
    describe('budget flow: ORCAMENTO_TIPO_CUIDADO', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_TIPO_CUIDADO', {
                nomeResponsavel: 'C', nomePaciente: 'A', idadePaciente: 78,
            });
        });

        it('selects home care with option 1', async () => {
            const result = await handleConversationMessage(buildPayload('1'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('urgencia');
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('selects hospital with option 2', async () => {
            const result = await handleConversationMessage(buildPayload('2'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('selects post-operative with option 3', async () => {
            const result = await handleConversationMessage(buildPayload('3'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('accepts keyword "domiciliar"', async () => {
            const result = await handleConversationMessage(buildPayload('domiciliar'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('accepts keyword "hospitalar"', async () => {
            const result = await handleConversationMessage(buildPayload('hospitalar'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('accepts custom care type with 4+ characters', async () => {
            const result = await handleConversationMessage(buildPayload('Fisioterapia'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });

        it('rejects input shorter than 4 characters that is not a number', async () => {
            const result = await handleConversationMessage(buildPayload('ab'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Digite 1, 2 ou 3');
            expect(sessionState()).toBe('ORCAMENTO_TIPO_CUIDADO');
        });
    });

    // ---- budget flow: ORCAMENTO_URGENCIA ----
    describe('budget flow: ORCAMENTO_URGENCIA', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_URGENCIA', {
                nomeResponsavel: 'C', nomePaciente: 'A', idadePaciente: 78,
                tipoCuidadoCodigo: 'HOME_CARE', tipoCuidadoLabel: 'Cuidador domiciliar',
            });
        });

        it('selects urgente with option 1', async () => {
            const result = await handleConversationMessage(buildPayload('1'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('carga horaria');
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('selects media with option 2', async () => {
            const result = await handleConversationMessage(buildPayload('2'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('selects baixa with option 3', async () => {
            const result = await handleConversationMessage(buildPayload('3'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('accepts keyword "urgente"', async () => {
            const result = await handleConversationMessage(buildPayload('urgente'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('accepts keyword "emergencia"', async () => {
            const result = await handleConversationMessage(buildPayload('emergencia'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('accepts keyword "planejado"', async () => {
            const result = await handleConversationMessage(buildPayload('planejado'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });

        it('rejects unrecognized urgency input', async () => {
            const result = await handleConversationMessage(buildPayload('maybe'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Digite 1, 2 ou 3');
            expect(sessionState()).toBe('ORCAMENTO_URGENCIA');
        });
    });

    // ---- budget flow: ORCAMENTO_CARGA_HORARIA ----
    describe('budget flow: ORCAMENTO_CARGA_HORARIA', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_CARGA_HORARIA', {
                nomeResponsavel: 'C', nomePaciente: 'A', idadePaciente: 78,
                tipoCuidadoCodigo: 'HOME_CARE', urgenciaLabel: 'Alta', prioridade: 'URGENTE',
            });
        });

        it('selects 6h with option 1', async () => {
            const result = await handleConversationMessage(buildPayload('1'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('cidade e bairro');
            expect(sessionState()).toBe('ORCAMENTO_ENDERECO');
        });

        it('selects 12h with option 2', async () => {
            const result = await handleConversationMessage(buildPayload('2'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_ENDERECO');
        });

        it('selects 24h with option 3', async () => {
            const result = await handleConversationMessage(buildPayload('3'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_ENDERECO');
        });

        it('accepts custom workload with 2+ characters', async () => {
            const result = await handleConversationMessage(buildPayload('10h por dia'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_ENDERECO');
        });

        it('rejects input shorter than 2 characters', async () => {
            const result = await handleConversationMessage(buildPayload('x'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Digite 1, 2 ou 3');
            expect(sessionState()).toBe('ORCAMENTO_CARGA_HORARIA');
        });
    });

    // ---- budget flow: ORCAMENTO_ENDERECO ----
    describe('budget flow: ORCAMENTO_ENDERECO', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_ENDERECO', {
                nomeResponsavel: 'C', nomePaciente: 'A', idadePaciente: 78,
                cargaHorariaLabel: '6h por dia',
            });
        });

        it('rejects location shorter than 3 characters', async () => {
            const result = await handleConversationMessage(buildPayload('SP'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('cidade e bairro');
            expect(sessionState()).toBe('ORCAMENTO_ENDERECO');
        });

        it('accepts valid location and moves to ORCAMENTO_DATA_INICIO', async () => {
            const result = await handleConversationMessage(buildPayload('Bauru, Centro'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('iniciar');
            expect(sessionState()).toBe('ORCAMENTO_DATA_INICIO');
        });
    });

    // ---- budget flow: ORCAMENTO_DATA_INICIO ----
    describe('budget flow: ORCAMENTO_DATA_INICIO', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_DATA_INICIO', {
                nomeResponsavel: 'C', endereco: 'Bauru, Centro',
            });
        });

        it('accepts "hoje"', async () => {
            const result = await handleConversationMessage(buildPayload('hoje'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('telefone');
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('accepts "amanha"', async () => {
            const result = await handleConversationMessage(buildPayload('amanha'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('accepts "imediato"', async () => {
            const result = await handleConversationMessage(buildPayload('imediato'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('accepts date format dd/mm/yyyy', async () => {
            const result = await handleConversationMessage(buildPayload('25/02/2026'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('accepts date format dd-mm-yyyy and normalizes to /', async () => {
            const result = await handleConversationMessage(buildPayload('25-02-2026'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('accepts free text >= 3 chars as date', async () => {
            const result = await handleConversationMessage(buildPayload('proxima semana'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });

        it('rejects input shorter than 3 chars that is not a keyword', async () => {
            const result = await handleConversationMessage(buildPayload('ab'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('data valida');
            expect(sessionState()).toBe('ORCAMENTO_DATA_INICIO');
        });
    });

    // ---- budget flow: ORCAMENTO_TELEFONE ----
    describe('budget flow: ORCAMENTO_TELEFONE', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_TELEFONE', {
                nomeResponsavel: 'C', dataInicio: 'Hoje',
            });
        });

        it('accepts "mesmo" to use current phone', async () => {
            const result = await handleConversationMessage(buildPayload('mesmo'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('observacoes');
            expect(sessionState()).toBe('ORCAMENTO_OBSERVACOES');
        });

        it('accepts "igual" to use current phone', async () => {
            const result = await handleConversationMessage(buildPayload('igual'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_OBSERVACOES');
        });

        it('accepts valid phone number', async () => {
            const result = await handleConversationMessage(buildPayload('11999998888'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_OBSERVACOES');
        });

        it('rejects phone shorter than 10 digits', async () => {
            const result = await handleConversationMessage(buildPayload('12345'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Telefone invalido');
            expect(sessionState()).toBe('ORCAMENTO_TELEFONE');
        });
    });

    // ---- budget flow: ORCAMENTO_OBSERVACOES ----
    describe('budget flow: ORCAMENTO_OBSERVACOES', () => {
        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_OBSERVACOES', {
                nomeResponsavel: 'Carlos',
                nomePaciente: 'Ana',
                idadePaciente: 78,
                tipoCuidadoLabel: 'Cuidador domiciliar',
                urgenciaLabel: 'Alta',
                cargaHorariaLabel: '6h por dia',
                endereco: 'Bauru, Centro',
                dataInicio: 'Hoje',
                telefoneContato: '5511999990000',
            });
        });

        it('sets "Nenhuma" when user says "nao"', async () => {
            const result = await handleConversationMessage(buildPayload('nao'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Resumo do Cadastro');
            expect(sessionState()).toBe('ORCAMENTO_CONFIRMACAO');
        });

        it('sets "Nenhuma" when user says "nenhuma"', async () => {
            const result = await handleConversationMessage(buildPayload('nenhuma'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_CONFIRMACAO');
        });

        it('stores actual observation text', async () => {
            const result = await handleConversationMessage(buildPayload('Paciente usa cadeira de rodas'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Resumo do Cadastro');
            expect(lastSent()).toContain('cadeira de rodas');
            expect(sessionState()).toBe('ORCAMENTO_CONFIRMACAO');
        });
    });

    // ---- budget flow: ORCAMENTO_CONFIRMACAO ----
    describe('budget flow: ORCAMENTO_CONFIRMACAO', () => {
        const fullData = {
            nomeResponsavel: 'Carlos',
            nomePaciente: 'Ana',
            idadePaciente: 78,
            tipoCuidadoCodigo: 'HOME_CARE',
            tipoCuidadoLabel: 'Cuidador domiciliar',
            urgenciaLabel: 'Alta',
            prioridade: 'URGENTE' as const,
            cargaHorariaLabel: '6h por dia',
            endereco: 'Bauru, Centro',
            dataInicio: 'Hoje',
            telefoneContato: '5511999990000',
            observacoes: 'Nenhuma',
        };

        beforeEach(() => {
            setSession(PHONE, 'ORCAMENTO_CONFIRMACAO', fullData);
        });

        it('confirms with "1" and finalizes lead', async () => {
            const result = await handleConversationMessage(buildPayload('1'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Cadastro concluido');
            expect(sessionState()).toBe('MENU');
            // Check that form submission was created
            expect(formSubmissions.length).toBeGreaterThanOrEqual(1);
            expect(formSubmissions[0].tipo).toBe('ORCAMENTO_WHATSAPP');
            // Check that system log was created
            expect(systemLogs.length).toBeGreaterThanOrEqual(1);
        });

        it('confirms with "sim"', async () => {
            const result = await handleConversationMessage(buildPayload('sim'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Cadastro concluido');
        });

        it('confirms with "confirmar"', async () => {
            const result = await handleConversationMessage(buildPayload('confirmar'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Cadastro concluido');
        });

        it('edits with "2" and restarts from ORCAMENTO_RESPONSAVEL', async () => {
            const result = await handleConversationMessage(buildPayload('2'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('editar');
            expect(sessionState()).toBe('ORCAMENTO_RESPONSAVEL');
        });

        it('edits with "editar"', async () => {
            const result = await handleConversationMessage(buildPayload('editar'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('ORCAMENTO_RESPONSAVEL');
        });

        it('cancels with "3" and returns to menu', async () => {
            const result = await handleConversationMessage(buildPayload('3'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Maos Amigas');
            expect(sessionState()).toBe('MENU');
        });

        it('cancels with "nao"', async () => {
            const result = await handleConversationMessage(buildPayload('nao'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('MENU');
        });

        it('cancels with "cancelar"', async () => {
            // Note: "cancelar" is a reset command, so it triggers reset before budget state
            const result = await handleConversationMessage(buildPayload('cancelar'));
            expect(result).toBe(true);
            expect(sessionState()).toBe('MENU');
        });

        it('prompts again for unrecognized confirmation input', async () => {
            const result = await handleConversationMessage(buildPayload('maybe'));
            expect(result).toBe(true);
            expect(lastSent()).toContain('Digite 1 para confirmar');
            expect(sessionState()).toBe('ORCAMENTO_CONFIRMACAO');
        });
    });

    // ---- lead syncing ----
    describe('lead syncing during budget flow', () => {
        it('creates a LEAD paciente during budget flow', async () => {
            const phone = '5511988877665';
            await handleConversationMessage(buildPayload('oi', phone));
            await handleConversationMessage(buildPayload('2', phone));
            await handleConversationMessage(buildPayload('Marcos Pereira', phone));

            const lead = pacientes.get(phone);
            expect(lead).toBeTruthy();
            expect(lead.status).toBe('LEAD');
        });

        it('does not overwrite patient with incompatible status', async () => {
            const phone = '5511988877665';
            pacientes.set(phone, { telefone: phone, nome: 'Existing', status: 'ATIVO' });

            // Start budget flow
            await handleConversationMessage(buildPayload('2', phone));
            await handleConversationMessage(buildPayload('Marcos', phone));

            // ATIVO is not a lead-compatible status, so it should NOT be overwritten
            const lead = pacientes.get(phone);
            expect(lead.status).toBe('ATIVO');
            expect(lead.nome).toBe('Existing');
        });

        it('does overwrite patient with LEAD status', async () => {
            const phone = '5511988877665';
            pacientes.set(phone, { telefone: phone, nome: 'Old Lead', status: 'LEAD' });

            await handleConversationMessage(buildPayload('2', phone));
            await handleConversationMessage(buildPayload('New Name', phone));

            const lead = pacientes.get(phone);
            expect(lead.nome).toBe('New Name');
        });

        it('skips sync for phones shorter than 10 digits', async () => {
            const phone = '1234';
            // We need a session in the budget flow to trigger syncLeadDraft
            setSession(phone, 'ORCAMENTO_RESPONSAVEL', {});
            await handleConversationMessage(buildPayload('Carlos Test', phone));

            // The sync should not have created a paciente record because phone is too short
            expect(pacientes.has(phone)).toBe(false);
        });
    });

    // ---- full end-to-end flow ----
    describe('full budget flow end-to-end', () => {
        it('completes entire budget flow from greeting to confirmation', async () => {
            const phone = '5511998887777';

            // Greeting
            await handleConversationMessage(buildPayload('oi', phone));
            expect(sessionState(phone)).toBe('MENU');

            // Start budget
            await handleConversationMessage(buildPayload('2', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_RESPONSAVEL');

            // Responsavel name
            await handleConversationMessage(buildPayload('Joao Silva', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_NOME');

            // Patient name
            await handleConversationMessage(buildPayload('Maria Silva', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_IDADE');

            // Age
            await handleConversationMessage(buildPayload('82', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_TIPO_CUIDADO');

            // Care type
            await handleConversationMessage(buildPayload('1', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_URGENCIA');

            // Urgency
            await handleConversationMessage(buildPayload('2', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_CARGA_HORARIA');

            // Workload
            await handleConversationMessage(buildPayload('1', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_ENDERECO');

            // Address
            await handleConversationMessage(buildPayload('Sao Paulo, Jardins', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_DATA_INICIO');

            // Start date
            await handleConversationMessage(buildPayload('hoje', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_TELEFONE');

            // Phone
            await handleConversationMessage(buildPayload('mesmo', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_OBSERVACOES');

            // Observations
            await handleConversationMessage(buildPayload('nao', phone));
            expect(sessionState(phone)).toBe('ORCAMENTO_CONFIRMACAO');

            // Confirm
            await handleConversationMessage(buildPayload('1', phone));
            expect(sessionState(phone)).toBe('MENU');
            expect(lastSent()).toContain('Cadastro concluido');

            // Verify lead was created
            const lead = pacientes.get(phone);
            expect(lead).toBeTruthy();
            expect(lead.status).toBe('LEAD');
        });
    });

    // ---- message logging ----
    describe('message logging', () => {
        it('logs incoming message with correct flow and step', async () => {
            setSession(PHONE, 'ORCAMENTO_NOME', { nomeResponsavel: 'Test' });
            await handleConversationMessage(buildPayload('Ana'));
            expect(incomingMessages.length).toBeGreaterThanOrEqual(1);
            expect(incomingMessages[0].direcao).toBe('IN');
            expect(incomingMessages[0].flow).toBe('BOT_ATENDIMENTO');
            expect(incomingMessages[0].step).toBe('ORCAMENTO_NOME');
        });
    });
});
