import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/database', () => ({
    DB: { form: { logSubmission: vi.fn().mockResolvedValue(undefined) } }
}));

import { handleCheckinPlantao } from '../checkin';
import { sendMessage } from '../../client';
import { setUserState } from '../../state-manager';
import { DB } from '@/lib/database';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makeState(overrides: Partial<UserState>): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'CHECKIN_PLANTAO',
        currentStep: '',
        data: { plantaoId: 'plantao-123' },
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('handleCheckinPlantao', () => {
    it('INICIO sends check-in confirmation message', async () => {
        await handleCheckinPlantao(makeMsg('INICIO'), makeState({}));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Check-in Realizado');
    });

    it('INICIO calls setUserState with SHIFT_IN_PROGRESS', async () => {
        await handleCheckinPlantao(makeMsg('INICIO'), makeState({}));

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({ currentStep: 'SHIFT_IN_PROGRESS' })
        );
    });

    it('FIM sends check-out message', async () => {
        const checkinTime = new Date(Date.now() - 3600_000).toISOString(); // 1 hour ago
        await handleCheckinPlantao(
            makeMsg('FIM'),
            makeState({ data: { plantaoId: 'plantao-123', checkinTime } })
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Plantão Encerrado');
    });

    it('FIM resets state to IDLE', async () => {
        await handleCheckinPlantao(makeMsg('FIM'), makeState({}));

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'IDLE',
                currentStep: '',
                data: {},
            })
        );
    });

    it('invalid input sends help message', async () => {
        await handleCheckinPlantao(makeMsg('blablabla'), makeState({}));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('INICIO');
        expect(msg).toContain('FIM');
    });
});
