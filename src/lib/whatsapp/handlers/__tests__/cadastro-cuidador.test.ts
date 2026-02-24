import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/db', () => ({
    prisma: { cuidador: { upsert: vi.fn().mockResolvedValue({ id: 'c1' }) } },
}));

import { handleCadastroCuidador } from '../cadastro-cuidador';
import { sendMessage } from '../../client';
import { setUserState } from '../../state-manager';
import { prisma } from '@/lib/db';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makeState(overrides: Partial<UserState> = {}): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'CADASTRO_CUIDADOR',
        currentStep: '',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    (prisma.cuidador.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1' });
});

// ---------------------------------------------------------------------------
// Step 1: AWAITING_AREA
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_AREA', () => {
    it('valid input "1" sends name prompt and sets state to AWAITING_NOME with area CUIDADOR', async () => {
        await handleCadastroCuidador(
            makeMsg('1'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('nome completo');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_NOME',
                data: expect.objectContaining({ area: 'CUIDADOR' }),
            }),
        );
    });

    it('valid input "2" maps to TECNICO_ENF', async () => {
        await handleCadastroCuidador(
            makeMsg('2'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ area: 'TECNICO_ENF' }),
            }),
        );
    });

    it('valid input "3" maps to AUXILIAR_ENF', async () => {
        await handleCadastroCuidador(
            makeMsg('3'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ area: 'AUXILIAR_ENF' }),
            }),
        );
    });

    it('valid input "4" maps to ENFERMEIRO', async () => {
        await handleCadastroCuidador(
            makeMsg('4'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ area: 'ENFERMEIRO' }),
            }),
        );
    });

    it('valid input "5" maps to OUTRO', async () => {
        await handleCadastroCuidador(
            makeMsg('5'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ area: 'OUTRO' }),
            }),
        );
    });

    it('invalid input "9" sends error message and does NOT advance state', async () => {
        await handleCadastroCuidador(
            makeMsg('9'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválida');
        expect(setUserState).not.toHaveBeenCalled();
    });

    it('invalid input "abc" sends error message', async () => {
        await handleCadastroCuidador(
            makeMsg('abc'),
            makeState({ currentStep: 'AWAITING_AREA' }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválida');
        expect(setUserState).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Step 2: AWAITING_NOME
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_NOME', () => {
    it('sets name in data and moves to AWAITING_CPF', async () => {
        await handleCadastroCuidador(
            makeMsg('Maria Silva'),
            makeState({ currentStep: 'AWAITING_NOME', data: { area: 'CUIDADOR' } }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('CPF');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_CPF',
                data: expect.objectContaining({
                    area: 'CUIDADOR',
                    nome: 'Maria Silva',
                }),
            }),
        );
    });

    it('trims whitespace from name', async () => {
        await handleCadastroCuidador(
            makeMsg('  João  '),
            makeState({ currentStep: 'AWAITING_NOME', data: { area: 'CUIDADOR' } }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ nome: 'João' }),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Step 3: AWAITING_CPF
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_CPF', () => {
    it('valid 11-digit CPF moves to AWAITING_EMAIL', async () => {
        await handleCadastroCuidador(
            makeMsg('12345678901'),
            makeState({
                currentStep: 'AWAITING_CPF',
                data: { area: 'CUIDADOR', nome: 'Maria Silva' },
            }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('email');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_EMAIL',
                data: expect.objectContaining({ cpf: '12345678901' }),
            }),
        );
    });

    it('CPF with formatting (dots/dashes) is accepted when digits total 11', async () => {
        await handleCadastroCuidador(
            makeMsg('123.456.789-01'),
            makeState({
                currentStep: 'AWAITING_CPF',
                data: { area: 'CUIDADOR', nome: 'Maria Silva' },
            }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_EMAIL',
                data: expect.objectContaining({ cpf: '12345678901' }),
            }),
        );
    });

    it('invalid CPF with wrong length sends error and does NOT advance', async () => {
        await handleCadastroCuidador(
            makeMsg('12345'),
            makeState({
                currentStep: 'AWAITING_CPF',
                data: { area: 'CUIDADOR', nome: 'Maria Silva' },
            }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválido');
        expect(setUserState).not.toHaveBeenCalled();
    });

    it('empty input sends CPF error', async () => {
        await handleCadastroCuidador(
            makeMsg(''),
            makeState({
                currentStep: 'AWAITING_CPF',
                data: { area: 'CUIDADOR', nome: 'Maria Silva' },
            }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválido');
        expect(setUserState).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Step 4: AWAITING_EMAIL
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_EMAIL', () => {
    const baseData = { area: 'CUIDADOR', nome: 'Maria Silva', cpf: '12345678901' };

    it('valid email moves to AWAITING_COREN', async () => {
        await handleCadastroCuidador(
            makeMsg('maria@email.com'),
            makeState({ currentStep: 'AWAITING_EMAIL', data: baseData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('COREN');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_COREN',
                data: expect.objectContaining({ email: 'maria@email.com' }),
            }),
        );
    });

    it('invalid email sends error and does NOT advance', async () => {
        await handleCadastroCuidador(
            makeMsg('not-an-email'),
            makeState({ currentStep: 'AWAITING_EMAIL', data: baseData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválido');
        expect(setUserState).not.toHaveBeenCalled();
    });

    it('email without domain sends error', async () => {
        await handleCadastroCuidador(
            makeMsg('maria@'),
            makeState({ currentStep: 'AWAITING_EMAIL', data: baseData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválido');
        expect(setUserState).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Step 5: AWAITING_COREN
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_COREN', () => {
    const baseData = {
        area: 'TECNICO_ENF',
        nome: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria@email.com',
    };

    it('number input stores as coren and moves to AWAITING_CIDADE', async () => {
        await handleCadastroCuidador(
            makeMsg('123456'),
            makeState({ currentStep: 'AWAITING_COREN', data: baseData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('cidade');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_CIDADE',
                data: expect.objectContaining({ coren: '123456' }),
            }),
        );
    });

    it('"NÃO" stores null coren and moves to AWAITING_CIDADE', async () => {
        await handleCadastroCuidador(
            makeMsg('NÃO'),
            makeState({ currentStep: 'AWAITING_COREN', data: baseData }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_CIDADE',
                data: expect.objectContaining({ coren: null }),
            }),
        );
    });

    it('"não" (lowercase) also stores null coren', async () => {
        await handleCadastroCuidador(
            makeMsg('não'),
            makeState({ currentStep: 'AWAITING_COREN', data: baseData }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ coren: null }),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Step 6: AWAITING_CIDADE
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_CIDADE', () => {
    const baseData = {
        area: 'CUIDADOR',
        nome: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria@email.com',
        coren: null,
    };

    it('stores cidade and moves to AWAITING_BAIRROS', async () => {
        await handleCadastroCuidador(
            makeMsg('São Paulo'),
            makeState({ currentStep: 'AWAITING_CIDADE', data: baseData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('bairros');

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentStep: 'AWAITING_BAIRROS',
                data: expect.objectContaining({ cidade: 'São Paulo' }),
            }),
        );
    });

    it('trims whitespace from city name', async () => {
        await handleCadastroCuidador(
            makeMsg('  Campinas  '),
            makeState({ currentStep: 'AWAITING_CIDADE', data: baseData }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ cidade: 'Campinas' }),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Step 7: AWAITING_BAIRROS — Finalização
// ---------------------------------------------------------------------------
describe('handleCadastroCuidador — AWAITING_BAIRROS', () => {
    const fullData = {
        area: 'CUIDADOR',
        nome: 'Maria Silva',
        cpf: '12345678901',
        email: 'maria@email.com',
        coren: null,
        cidade: 'São Paulo',
    };

    it('persists to DB via prisma.cuidador.upsert', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro, Liberdade, Consolação'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        expect(prisma.cuidador.upsert).toHaveBeenCalledOnce();
        expect(prisma.cuidador.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { telefone: '5511999990000' },
                update: expect.objectContaining({
                    nome: 'Maria Silva',
                    area: 'CUIDADOR',
                    status: 'CANDIDATO',
                    endereco: 'Centro, Liberdade, Consolação, São Paulo',
                }),
                create: expect.objectContaining({
                    telefone: '5511999990000',
                    nome: 'Maria Silva',
                    area: 'CUIDADOR',
                    status: 'CANDIDATO',
                    endereco: 'Centro, Liberdade, Consolação, São Paulo',
                }),
            }),
        );
    });

    it('sends summary message containing name, area label, and location', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro, Liberdade'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Maria Silva');
        expect(msg).toContain('Cuidador(a) de Idosos');
        expect(msg).toContain('Centro, Liberdade');
        expect(msg).toContain('São Paulo');
        expect(msg).toContain('maria@email.com');
        expect(msg).toContain('Resumo');
    });

    it('summary includes COREN when provided', async () => {
        const dataWithCoren = { ...fullData, coren: '123456' };

        await handleCadastroCuidador(
            makeMsg('Centro'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: dataWithCoren }),
        );

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('COREN');
        expect(msg).toContain('123456');
    });

    it('summary omits COREN line when coren is null', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).not.toContain('COREN');
    });

    it('sets state to AGUARDANDO_RH / CADASTRO_COMPLETO with accumulated data', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro, Liberdade'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentFlow: 'AGUARDANDO_RH',
                currentStep: 'CADASTRO_COMPLETO',
                data: expect.objectContaining({
                    nome: 'Maria Silva',
                    area: 'CUIDADOR',
                    email: 'maria@email.com',
                    cpf: '12345678901',
                    cidade: 'São Paulo',
                    bairros: 'Centro, Liberdade',
                    telefone: '5511999990000',
                    cadastroCompleto: true,
                }),
            }),
        );
    });

    it('state data includes dataCadastro as ISO string', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        const stateCall = (setUserState as ReturnType<typeof vi.fn>).mock.calls[0];
        const data = stateCall[1].data;
        expect(data.dataCadastro).toBeDefined();
        expect(typeof data.dataCadastro).toBe('string');
        // Should be a valid ISO date string
        expect(new Date(data.dataCadastro).toISOString()).toBe(data.dataCadastro);
    });

    it('handles DB error gracefully — still sends summary and sets state', async () => {
        (prisma.cuidador.upsert as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error('DB connection failed'),
        );

        await handleCadastroCuidador(
            makeMsg('Centro'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        // Even though DB failed, summary should still be sent
        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Maria Silva');

        // State should still be set
        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentFlow: 'AGUARDANDO_RH',
                currentStep: 'CADASTRO_COMPLETO',
            }),
        );
    });

    it('trims and joins bairros with comma-space', async () => {
        await handleCadastroCuidador(
            makeMsg('  Centro ,  Liberdade , Consolação  '),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        expect(prisma.cuidador.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({
                    endereco: 'Centro, Liberdade, Consolação, São Paulo',
                }),
            }),
        );
    });

    it('uses area label "Técnico(a) de Enfermagem" for TECNICO_ENF', async () => {
        const tecData = { ...fullData, area: 'TECNICO_ENF' };

        await handleCadastroCuidador(
            makeMsg('Centro'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: tecData }),
        );

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Técnico(a) de Enfermagem');
    });

    it('strips @s.whatsapp.net from phone for DB and state', async () => {
        await handleCadastroCuidador(
            makeMsg('Centro', '5511888880000@s.whatsapp.net'),
            makeState({ currentStep: 'AWAITING_BAIRROS', data: fullData }),
        );

        expect(prisma.cuidador.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { telefone: '5511888880000' },
            }),
        );

        expect(setUserState).toHaveBeenCalledWith(
            '5511888880000',
            expect.objectContaining({
                data: expect.objectContaining({ telefone: '5511888880000' }),
            }),
        );
    });
});
