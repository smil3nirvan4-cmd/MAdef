import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('../../client', () => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../state-manager', () => ({
    getUserState: vi.fn().mockResolvedValue(null),
    setUserState: vi.fn().mockResolvedValue({
        phone: '5511999990000',
        currentFlow: 'ONBOARDING',
        currentStep: 'WELCOME',
        data: {},
        lastInteraction: new Date(),
    }),
}));

vi.mock('../onboarding', () => ({
    handleOnboarding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../cadastro-cuidador', () => ({
    handleCadastroCuidador: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../oferta-plantao', () => ({
    handleOfertaPlantao: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../escolha-slot', () => ({
    handleEscolhaSlot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../quiz', () => ({
    handleQuiz: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../aceite-orcamento', () => ({
    handleAceiteOrcamento: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../assinatura-contrato', () => ({
    handleAssinaturaContrato: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../checkin', () => ({
    handleCheckinPlantao: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../reprovado', () => ({
    handleReprovado: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../aguardando', () => ({
    handleAguardando: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../confirmacao-proposta', () => ({
    handleConfirmacaoProposta: vi.fn().mockResolvedValue(undefined),
    handleAssinaturaContrato: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/notifications/emergency', () => ({
    notifyAdminHelp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/database', () => ({
    logMessage: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports ────────────────────────────────────────────────────
import { handleIncomingMessage } from '../index';
import { sendMessage } from '../../client';
import { getUserState, setUserState } from '../../state-manager';
import { handleOnboarding } from '../onboarding';
import { handleCadastroCuidador } from '../cadastro-cuidador';
import { handleOfertaPlantao } from '../oferta-plantao';
import { handleEscolhaSlot } from '../escolha-slot';
import { handleQuiz } from '../quiz';
import { handleAceiteOrcamento } from '../aceite-orcamento';
import { handleAssinaturaContrato } from '../assinatura-contrato';
import { handleCheckinPlantao } from '../checkin';
import { handleReprovado } from '../reprovado';
import { handleAguardando } from '../aguardando';
import { handleConfirmacaoProposta, handleAssinaturaContrato as handleAssinaturaContratoNovo } from '../confirmacao-proposta';
import { notifyAdminHelp } from '@/lib/notifications/emergency';
import type { UserState } from '@/lib/state/types';

// ── Helpers ────────────────────────────────────────────────────
const JID = '5511999990000@s.whatsapp.net';
const PHONE = '5511999990000';

function makeRawMsg(overrides: Record<string, any> = {}) {
    return {
        key: { remoteJid: JID, id: 'msg-001' },
        message: { conversation: 'hello' },
        ...overrides,
    };
}

function makeState(overrides: Partial<UserState> = {}): UserState {
    return {
        phone: PHONE,
        currentFlow: 'MAIN_MENU',
        currentStep: 'SELECT_OPTION',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

// ── Setup ──────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserState).mockResolvedValue(null);
    vi.mocked(setUserState).mockResolvedValue(makeState({ currentFlow: 'ONBOARDING', currentStep: 'WELCOME' }));
});

// ── Tests ──────────────────────────────────────────────────────
describe('handleIncomingMessage', () => {
    // ── Message parsing ────────────────────────────────────────
    describe('message parsing', () => {
        it('extracts text from conversation field', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({ message: { conversation: 'ola' } });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({ body: 'ola', type: 'text' }),
                expect.any(Object),
            );
        });

        it('extracts text from extendedTextMessage', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: { extendedTextMessage: { text: 'extended hello' } },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({ body: 'extended hello' }),
                expect.any(Object),
            );
        });

        it('parses buttonsResponseMessage', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: {
                    buttonsResponseMessage: {
                        selectedButtonId: 'action:confirm|order:123',
                        selectedDisplayText: 'Confirmar',
                    },
                },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'Confirmar',
                    type: 'button_reply',
                    buttonResponse: expect.objectContaining({
                        id: 'action:confirm|order:123',
                        text: 'Confirmar',
                        payload: { action: 'confirm', order: '123' },
                    }),
                }),
                expect.any(Object),
            );
        });

        it('parses templateButtonReplyMessage', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: {
                    templateButtonReplyMessage: {
                        selectedId: 'tpl:accept',
                        selectedDisplayText: 'Aceitar',
                    },
                },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'Aceitar',
                    type: 'button_reply',
                }),
                expect.any(Object),
            );
        });

        it('parses listResponseMessage', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: {
                    listResponseMessage: {
                        singleSelectReply: { selectedRowId: 'row-1' },
                        title: 'Option Title',
                        description: 'desc',
                    },
                },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'row-1',
                    type: 'list_reply',
                    listResponse: expect.objectContaining({
                        id: 'row-1',
                        title: 'Option Title',
                        description: 'desc',
                    }),
                }),
                expect.any(Object),
            );
        });

        it('parses interactiveResponseMessage', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: {
                    interactiveResponseMessage: {
                        nativeFlowResponseMessage: {
                            paramsJson: JSON.stringify({ id: 'btn-1', display_text: 'Click' }),
                        },
                    },
                },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: 'Click',
                    type: 'button_reply',
                }),
                expect.any(Object),
            );
        });

        it('handles invalid JSON in interactiveResponseMessage gracefully', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                message: {
                    conversation: 'fallback text',
                    interactiveResponseMessage: {
                        nativeFlowResponseMessage: {
                            paramsJson: 'not-json',
                        },
                    },
                },
            });

            // Should not throw
            await handleIncomingMessage(msg);

            // Falls through to onboarding with conversation text
            expect(handleOnboarding).toHaveBeenCalled();
        });

        it('extracts phone from @s.whatsapp.net JID', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                key: { remoteJid: '5511888880000@s.whatsapp.net', id: 'msg-1' },
                message: { conversation: 'test' },
            });

            await handleIncomingMessage(msg);

            expect(getUserState).toHaveBeenCalledWith('5511888880000');
        });

        it('extracts phone from @lid JID', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                key: { remoteJid: '5511888880000@lid', id: 'msg-1' },
                message: { conversation: 'test' },
            });

            await handleIncomingMessage(msg);

            expect(getUserState).toHaveBeenCalledWith('5511888880000');
        });
    });

    // ── Empty / protocol messages ──────────────────────────────
    describe('empty messages', () => {
        it('ignores messages with no body, button, or list response', async () => {
            const msg = makeRawMsg({ message: {} });

            await handleIncomingMessage(msg);

            expect(getUserState).not.toHaveBeenCalled();
            expect(sendMessage).not.toHaveBeenCalled();
        });
    });

    // ── Global commands ────────────────────────────────────────
    describe('global commands', () => {
        it('MENU sets state to MAIN_MENU and sends menu', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState());
            const msg = makeRawMsg({ message: { conversation: 'MENU' } });

            await handleIncomingMessage(msg);

            expect(setUserState).toHaveBeenCalledWith(PHONE, expect.objectContaining({
                currentFlow: 'MAIN_MENU',
                currentStep: 'SELECT_OPTION',
            }));
            expect(sendMessage).toHaveBeenCalledWith(
                JID,
                expect.stringContaining('MENU PRINCIPAL'),
            );
        });

        it('menu (lowercase) also triggers menu', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState());
            const msg = makeRawMsg({ message: { conversation: 'menu' } });

            await handleIncomingMessage(msg);

            expect(setUserState).toHaveBeenCalledWith(PHONE, expect.objectContaining({
                currentFlow: 'MAIN_MENU',
            }));
        });

        it('AJUDA sends help message and notifies admin', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState());
            const msg = makeRawMsg({ message: { conversation: 'AJUDA' } });

            await handleIncomingMessage(msg);

            expect(sendMessage).toHaveBeenCalledWith(
                JID,
                expect.stringContaining('Central de Atendimento'),
            );
            expect(notifyAdminHelp).toHaveBeenCalledWith(JID);
        });

        it('ajuda (lowercase) also triggers help', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState());
            const msg = makeRawMsg({ message: { conversation: 'ajuda' } });

            await handleIncomingMessage(msg);

            expect(notifyAdminHelp).toHaveBeenCalledWith(JID);
        });
    });

    // ── No state -> onboarding ─────────────────────────────────
    describe('no state (new user)', () => {
        it('creates ONBOARDING state and calls handleOnboarding', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({ message: { conversation: 'oi' } });

            await handleIncomingMessage(msg);

            expect(setUserState).toHaveBeenCalledWith(PHONE, {
                currentFlow: 'ONBOARDING',
                currentStep: 'WELCOME',
                data: {},
            });
            expect(handleOnboarding).toHaveBeenCalled();
        });
    });

    // ── Flow routing ───────────────────────────────────────────
    describe('flow routing', () => {
        const flowHandlerMap: [string, () => ReturnType<typeof vi.fn>][] = [
            ['ONBOARDING', () => vi.mocked(handleOnboarding)],
            ['CADASTRO_PACIENTE', () => vi.mocked(handleOnboarding)],
            ['CADASTRO_CUIDADOR', () => vi.mocked(handleCadastroCuidador)],
            ['OFERTA_PLANTAO', () => vi.mocked(handleOfertaPlantao)],
            ['ESCOLHA_SLOT', () => vi.mocked(handleEscolhaSlot)],
            ['AGUARDANDO_ACEITE_ORCAMENTO', () => vi.mocked(handleAceiteOrcamento)],
            ['AGUARDANDO_ASSINATURA', () => vi.mocked(handleAssinaturaContrato)],
            ['CHECKIN_PLANTAO', () => vi.mocked(handleCheckinPlantao)],
            ['QUIZ', () => vi.mocked(handleQuiz)],
            ['REPROVADO_TRIAGEM', () => vi.mocked(handleReprovado)],
            ['AGUARDANDO_RH', () => vi.mocked(handleAguardando)],
            ['AGUARDANDO_AVALIACAO', () => vi.mocked(handleAguardando)],
            ['AGUARDANDO_RESPOSTA_PROPOSTA', () => vi.mocked(handleConfirmacaoProposta)],
            ['AGUARDANDO_CONTRATO', () => vi.mocked(handleAssinaturaContratoNovo)],
        ];

        it.each(flowHandlerMap)('routes %s flow to the correct handler', async (flow, getHandler) => {
            vi.mocked(getUserState).mockResolvedValue(makeState({ currentFlow: flow }));
            const msg = makeRawMsg({ message: { conversation: 'test message' } });

            await handleIncomingMessage(msg);

            const handler = getHandler();
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ body: 'test message' }),
                expect.objectContaining({ currentFlow: flow }),
            );
        });

        it('routes MAIN_MENU to handleMainMenu (option 1)', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState({ currentFlow: 'MAIN_MENU' }));
            const msg = makeRawMsg({ message: { conversation: '1' } });

            await handleIncomingMessage(msg);

            expect(sendMessage).toHaveBeenCalledWith(
                JID,
                expect.stringContaining('Meus Plantões'),
            );
        });

        it('routes CLIENTE_ATIVO to handleMainMenu', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState({ currentFlow: 'CLIENTE_ATIVO' }));
            const msg = makeRawMsg({ message: { conversation: '1' } });

            await handleIncomingMessage(msg);

            expect(sendMessage).toHaveBeenCalledWith(
                JID,
                expect.stringContaining('Meus Plantões'),
            );
        });

        it('sends default help message for unknown flows', async () => {
            vi.mocked(getUserState).mockResolvedValue(makeState({ currentFlow: 'UNKNOWN_FLOW' }));
            const msg = makeRawMsg({ message: { conversation: 'test' } });

            await handleIncomingMessage(msg);

            expect(sendMessage).toHaveBeenCalledWith(
                PHONE,
                expect.stringContaining('Não entendi sua mensagem'),
            );
        });
    });

    // ── Main menu options ──────────────────────────────────────
    describe('main menu options', () => {
        beforeEach(() => {
            vi.mocked(getUserState).mockResolvedValue(makeState({ currentFlow: 'MAIN_MENU' }));
        });

        it('option 1: shows plantoes', async () => {
            const msg = makeRawMsg({ message: { conversation: '1' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Meus Plantões'));
        });

        it('option 2: shows user data with nome from state', async () => {
            vi.mocked(getUserState).mockResolvedValue(
                makeState({ currentFlow: 'MAIN_MENU', data: { nome: 'Maria' } }),
            );
            const msg = makeRawMsg({ message: { conversation: '2' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Nome: Maria'));
        });

        it('option 2: shows nomePaciente as fallback', async () => {
            vi.mocked(getUserState).mockResolvedValue(
                makeState({ currentFlow: 'MAIN_MENU', data: { nomePaciente: 'Jose' } }),
            );
            const msg = makeRawMsg({ message: { conversation: '2' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Nome: Jose'));
        });

        it('option 2: shows "Nao informado" when no name data', async () => {
            vi.mocked(getUserState).mockResolvedValue(
                makeState({ currentFlow: 'MAIN_MENU', data: {} }),
            );
            const msg = makeRawMsg({ message: { conversation: '2' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Não informado'));
        });

        it('option 3: sends help and notifies admin', async () => {
            const msg = makeRawMsg({ message: { conversation: '3' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Central de Atendimento'));
            expect(notifyAdminHelp).toHaveBeenCalledWith(JID);
        });

        it('option 4: notifies atendente and sends confirmation', async () => {
            const msg = makeRawMsg({ message: { conversation: '4' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('atendente humano'));
            expect(notifyAdminHelp).toHaveBeenCalledWith(JID);
        });

        it('invalid option: sends error message', async () => {
            const msg = makeRawMsg({ message: { conversation: '99' } });
            await handleIncomingMessage(msg);
            expect(sendMessage).toHaveBeenCalledWith(JID, expect.stringContaining('Opção inválida'));
        });
    });

    // ── Uses full JID for message.from ─────────────────────────
    describe('JID handling', () => {
        it('passes full JID as message.from', async () => {
            vi.mocked(getUserState).mockResolvedValue(null);
            const msg = makeRawMsg({
                key: { remoteJid: '5511888880000@s.whatsapp.net', id: 'msg-2' },
                message: { conversation: 'oi' },
            });

            await handleIncomingMessage(msg);

            expect(handleOnboarding).toHaveBeenCalledWith(
                expect.objectContaining({ from: '5511888880000@s.whatsapp.net' }),
                expect.any(Object),
            );
        });
    });
});
