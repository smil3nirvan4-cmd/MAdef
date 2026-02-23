import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody, parseQuery } from '@/lib/api/parse-body';
import { iniciarAlocacaoSchema } from '@/lib/validations/alocacao';
import { hospitalAvaliacaoSchema } from '@/lib/validations/avaliacao';
import { enviarPropostaSchema } from '@/lib/validations/proposta';
import { pairSchema } from '@/lib/validations/whatsapp';

function buildJsonRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function buildInvalidJsonRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not valid json{{{',
    });
}

describe('parseBody: JSON parsing', () => {
    it('returns 400 for invalid JSON body', async () => {
        const req = buildInvalidJsonRequest();
        const result = await parseBody(req, z.object({}));

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
    });

    it('returns validated data for valid body', async () => {
        const req = buildJsonRequest({ nome: 'Teste', idade: 42 });
        const schema = z.object({ nome: z.string(), idade: z.number() });
        const result = await parseBody(req, schema);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({ nome: 'Teste', idade: 42 });
    });

    it('strips extra fields (Zod default strip behavior)', async () => {
        const req = buildJsonRequest({ nome: 'Teste', malicious: '<script>alert(1)</script>' });
        const schema = z.object({ nome: z.string() });
        const result = await parseBody(req, schema);

        expect(result.data).toEqual({ nome: 'Teste' });
        expect((result.data as Record<string, unknown>)?.malicious).toBeUndefined();
    });

    it('returns 400 with Zod errors for invalid fields', async () => {
        const req = buildJsonRequest({ nome: 123 });
        const schema = z.object({ nome: z.string() });
        const result = await parseBody(req, schema);

        expect(result.error).toBeDefined();
    });
});

describe('parseBody: empty body on POST', () => {
    it('returns 400 for empty body', async () => {
        const req = new NextRequest('http://localhost:3000/api/test', {
            method: 'POST',
        });
        const result = await parseBody(req, z.object({ nome: z.string() }));

        expect(result.error).toBeDefined();
    });
});

describe('Validation: alocacao schema', () => {
    it('validates a complete alocacao body', async () => {
        const body = {
            equipeId: 'eq1',
            pacienteId: 'pac1',
            modo: 'IMPOSITIVA',
            horasDiarias: 12,
            duracaoDias: 7,
            cuidadores: [],
        };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, iniciarAlocacaoSchema);

        expect(result.error).toBeUndefined();
        expect(result.data?.equipeId).toBe('eq1');
        expect(result.data?.modo).toBe('IMPOSITIVA');
    });

    it('rejects invalid modo value', async () => {
        const body = {
            equipeId: 'eq1',
            pacienteId: 'pac1',
            modo: 'INVALIDO',
        };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, iniciarAlocacaoSchema);

        expect(result.error).toBeDefined();
    });

    it('rejects missing required fields', async () => {
        const req = buildJsonRequest({});
        const result = await parseBody(req, iniciarAlocacaoSchema);

        expect(result.error).toBeDefined();
    });

    it('applies defaults for optional fields', async () => {
        const body = {
            equipeId: 'eq1',
            pacienteId: 'pac1',
            modo: 'ESCOLHA',
        };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, iniciarAlocacaoSchema);

        expect(result.error).toBeUndefined();
        expect(result.data?.horasDiarias).toBe(12);
        expect(result.data?.duracaoDias).toBe(7);
    });
});

describe('Validation: hospital avaliacao schema', () => {
    it('validates a hospital avaliacao body', async () => {
        const body = { nome: 'Joao', hospital: 'HSL', nivel: 'ALTO', quarto: '301' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, hospitalAvaliacaoSchema);

        expect(result.error).toBeUndefined();
        expect(result.data?.nome).toBe('Joao');
    });

    it('rejects when nome is empty', async () => {
        const body = { nome: '', hospital: 'HSL', nivel: 'ALTO' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, hospitalAvaliacaoSchema);

        expect(result.error).toBeDefined();
    });

    it('rejects when hospital is missing', async () => {
        const body = { nome: 'Joao', nivel: 'ALTO' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, hospitalAvaliacaoSchema);

        expect(result.error).toBeDefined();
    });
});

describe('Validation: proposta schema', () => {
    it('validates a proposta body', async () => {
        const body = { phone: '5511999999999', nome: 'Maria' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, enviarPropostaSchema);

        expect(result.error).toBeUndefined();
        expect(result.data?.phone).toBe('5511999999999');
    });

    it('rejects empty phone', async () => {
        const body = { phone: '', nome: 'Maria' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, enviarPropostaSchema);

        expect(result.error).toBeDefined();
    });

    it('rejects missing nome', async () => {
        const body = { phone: '5511999999999' };
        const req = buildJsonRequest(body);
        const result = await parseBody(req, enviarPropostaSchema);

        expect(result.error).toBeDefined();
    });
});

describe('Validation: whatsapp pair schema', () => {
    it('accepts body with phone', async () => {
        const req = buildJsonRequest({ phone: '5511999999999' });
        const result = await parseBody(req, pairSchema);

        expect(result.error).toBeUndefined();
        expect(result.data?.phone).toBe('5511999999999');
    });

    it('accepts empty body', async () => {
        const req = buildJsonRequest({});
        const result = await parseBody(req, pairSchema);

        expect(result.error).toBeUndefined();
    });
});
