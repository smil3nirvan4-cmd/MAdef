import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../state-manager', () => ({
    setUserState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/notifications/emergency', () => ({
    notifyEmergencyTeam: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        paciente: { upsert: vi.fn().mockResolvedValue({ id: 'pac-1' }) },
        cuidador: { upsert: vi.fn().mockResolvedValue({ id: 'cui-1' }) },
    },
}));

vi.mock('@/lib/config/public-url', () => ({
    buildAppUrl: vi.fn((path: string) => `https://app.example.com${path}`),
}));

import { handleOnboarding } from './onboarding';
import { sendMessage } from '../client';
import { setUserState } from '../state-manager';
import { notifyEmergencyTeam } from '@/lib/notifications/emergency';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function s(overrides: Partial<UserState>): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'ONBOARDING',
        currentStep: 'WELCOME',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('handleOnboarding', () => {
    it('sends welcome message and advances to AWAITING_TYPE', async () => {
        await handleOnboarding(makeMsg('oi'), s({ currentStep: 'WELCOME' }));

        expect(sendMessage).toHaveBeenCalledTimes(1);
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Bem-vindo');
        expect(setUserState).toHaveBeenCalledWith('5511999990000', { currentStep: 'AWAITING_TYPE' });
    });

    it('option 1 (paciente) → AWAITING_URGENCY_TYPE', async () => {
        await handleOnboarding(makeMsg('1'), s({ currentStep: 'AWAITING_TYPE' }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentFlow: 'CADASTRO_PACIENTE',
            currentStep: 'AWAITING_URGENCY_TYPE',
        }));
    });

    it('option 2 (profissional) → AWAITING_AREA', async () => {
        await handleOnboarding(makeMsg('2'), s({ currentStep: 'AWAITING_TYPE' }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentFlow: 'CADASTRO_CUIDADOR',
            currentStep: 'AWAITING_AREA',
        }));
    });

    it('invalid option in AWAITING_TYPE sends error message', async () => {
        await handleOnboarding(makeMsg('99'), s({ currentStep: 'AWAITING_TYPE' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválida');
        expect(setUserState).not.toHaveBeenCalled();
    });

    it('emergency (option 1 urgency) calls notifyEmergencyTeam', async () => {
        await handleOnboarding(makeMsg('1'), s({ currentStep: 'AWAITING_URGENCY_TYPE' }));

        expect(notifyEmergencyTeam).toHaveBeenCalledWith('5511999990000@s.whatsapp.net');
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('192');
        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentFlow: 'EMERGENCIA_ACIONADA',
        }));
    });

    it('planned care (option 2 urgency) → AWAITING_METHOD', async () => {
        await handleOnboarding(makeMsg('2'), s({ currentStep: 'AWAITING_URGENCY_TYPE' }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentStep: 'AWAITING_METHOD',
        }));
    });

    it('invalid urgency option sends guidance', async () => {
        await handleOnboarding(makeMsg('5'), s({ currentStep: 'AWAITING_URGENCY_TYPE' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('1');
        expect(msg).toContain('2');
    });

    it('method option 1 (site) sends sign-up URL', async () => {
        await handleOnboarding(makeMsg('1'), s({ currentStep: 'AWAITING_METHOD' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('https://app.example.com/cadastro');
    });

    it('method option 2 (chat) → AWAITING_PATIENT_NAME', async () => {
        await handleOnboarding(makeMsg('2'), s({ currentStep: 'AWAITING_METHOD' }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentStep: 'AWAITING_PATIENT_NAME',
        }));
    });

    it('patient name step detects priority keyword "hospital"', async () => {
        await handleOnboarding(makeMsg('João hospital ABC'), s({
            currentStep: 'AWAITING_PATIENT_NAME',
            data: { tipo: 'PACIENTE' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentStep: 'AWAITING_LOCATION',
            data: expect.objectContaining({
                prioridade: 'ALTA',
                nomePaciente: 'João hospital ABC',
            }),
        }));
    });

    it('patient name without priority keywords gets NORMAL', async () => {
        await handleOnboarding(makeMsg('Maria Silva'), s({
            currentStep: 'AWAITING_PATIENT_NAME',
            data: { tipo: 'PACIENTE' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            data: expect.objectContaining({ prioridade: 'NORMAL' }),
        }));
    });

    it('location step parses city and bairro from comma-separated', async () => {
        await handleOnboarding(makeMsg('São Paulo, Vila Mariana'), s({
            currentStep: 'AWAITING_LOCATION',
            data: { nomePaciente: 'Maria' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            data: expect.objectContaining({ cidade: 'São Paulo', bairro: 'Vila Mariana' }),
        }));
    });

    it('care type option 1 → HOME_CARE', async () => {
        await handleOnboarding(makeMsg('1'), s({
            currentStep: 'AWAITING_CARE_TYPE',
            data: { nomePaciente: 'Maria', cidade: 'SP' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            data: expect.objectContaining({ tipoCuidado: 'HOME_CARE' }),
        }));
    });

    it('care type option 2 → HOSPITAL', async () => {
        await handleOnboarding(makeMsg('2'), s({
            currentStep: 'AWAITING_CARE_TYPE',
            data: { nomePaciente: 'Maria', cidade: 'SP' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            data: expect.objectContaining({ tipoCuidado: 'HOSPITAL' }),
        }));
    });

    it('invalid care type sends error', async () => {
        await handleOnboarding(makeMsg('3'), s({
            currentStep: 'AWAITING_CARE_TYPE',
            data: {},
        }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('1');
    });

    it('condition step accepts valid options 1-6', async () => {
        await handleOnboarding(makeMsg('4'), s({
            currentStep: 'AWAITING_CONDITION',
            data: { tipoCuidado: 'HOME_CARE' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            data: expect.objectContaining({ condicao: 'DEMENCIA' }),
        }));
    });

    it('condition step rejects invalid option', async () => {
        await handleOnboarding(makeMsg('9'), s({
            currentStep: 'AWAITING_CONDITION',
            data: {},
        }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('1 a 6');
    });

    it('hours step completes onboarding with 24h', async () => {
        await handleOnboarding(makeMsg('3'), s({
            currentStep: 'AWAITING_HOURS',
            data: { nomePaciente: 'Maria', cidade: 'SP', tipoCuidado: 'HOME_CARE' },
        }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.objectContaining({
            currentFlow: 'AGUARDANDO_AVALIACAO',
            currentStep: 'CADASTRO_COMPLETO',
        }));
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('24h/dia');
    });

    it('hours step rejects invalid option', async () => {
        await handleOnboarding(makeMsg('5'), s({
            currentStep: 'AWAITING_HOURS',
            data: {},
        }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('1, 2 ou 3');
    });

    it('strips @lid suffix from phone for state', async () => {
        await handleOnboarding(makeMsg('oi', '5511999990000@lid'), s({ currentStep: 'WELCOME' }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', expect.anything());
    });
});
