import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'cr-1', subjectPhone: '5511999990000', tipo: 'TERMS', consentido: true });
    const mockFindMany = vi.fn().mockResolvedValue([]);
    const mockFindUnique = vi.fn().mockResolvedValue(null);
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

    return {
        prisma: {
            consentRecord: { create: mockCreate, findMany: mockFindMany },
            paciente: { findUnique: mockFindUnique, update: mockUpdate },
            cuidador: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
            mensagem: { findMany: vi.fn().mockResolvedValue([]), updateMany: mockUpdateMany },
            formSubmission: { findMany: vi.fn().mockResolvedValue([]), updateMany: mockUpdateMany },
        },
    };
});

import {
    recordConsent,
    getConsentHistory,
    getActiveConsents,
    exportPersonalData,
    anonymizePersonalData,
} from '../service';
import { prisma } from '@/lib/prisma';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('recordConsent', () => {
    it('creates a consent record', async () => {
        await recordConsent({
            subjectPhone: '5511999990000',
            tipo: 'TERMS',
            consentido: true,
        });

        expect(prisma.consentRecord.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                subjectPhone: '5511999990000',
                tipo: 'TERMS',
                consentido: true,
                revokedAt: null,
            }),
        });
    });

    it('sets revokedAt when consent is revoked', async () => {
        await recordConsent({
            subjectPhone: '5511999990000',
            tipo: 'MARKETING',
            consentido: false,
        });

        expect(prisma.consentRecord.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                consentido: false,
                revokedAt: expect.any(Date),
            }),
        });
    });
});

describe('getConsentHistory', () => {
    it('returns all consent records for phone', async () => {
        vi.mocked(prisma.consentRecord.findMany).mockResolvedValueOnce([
            { id: '1', tipo: 'TERMS', consentido: true },
            { id: '2', tipo: 'MARKETING', consentido: false },
        ] as any);

        const result = await getConsentHistory('5511999990000');
        expect(result).toHaveLength(2);
        expect(prisma.consentRecord.findMany).toHaveBeenCalledWith({
            where: { subjectPhone: '5511999990000' },
            orderBy: { createdAt: 'desc' },
        });
    });
});

describe('getActiveConsents', () => {
    it('returns latest consent per type', async () => {
        vi.mocked(prisma.consentRecord.findMany).mockResolvedValueOnce([
            { id: '3', tipo: 'TERMS', consentido: true, createdAt: new Date('2025-01-02') },
            { id: '2', tipo: 'TERMS', consentido: false, createdAt: new Date('2025-01-01') },
            { id: '1', tipo: 'MARKETING', consentido: true, createdAt: new Date('2025-01-01') },
        ] as any);

        const result = await getActiveConsents('5511999990000');
        expect(result).toEqual({ TERMS: true, MARKETING: true });
    });
});

describe('exportPersonalData', () => {
    it('returns aggregated personal data', async () => {
        vi.mocked(prisma.paciente.findUnique).mockResolvedValueOnce({
            id: 'p-1', nome: 'Maria', telefone: '5511999990000',
            avaliacoes: [], orcamentos: [], alocacoes: [],
        } as any);

        const result = await exportPersonalData('5511999990000');
        expect(result.subject).toBe('5511999990000');
        expect(result.exportedAt).toBeDefined();
        expect(result.paciente).toBeDefined();
    });
});

describe('anonymizePersonalData', () => {
    it('anonymizes paciente data', async () => {
        vi.mocked(prisma.paciente.findUnique).mockResolvedValueOnce({
            id: 'p-1', telefone: '5511999990000',
        } as any);

        const result = await anonymizePersonalData('5511999990000');
        expect(result.anonymized).toBe(true);
        expect(prisma.paciente.update).toHaveBeenCalledWith({
            where: { telefone: '5511999990000' },
            data: expect.objectContaining({ nome: '[ANONIMIZADO]' }),
        });
    });

    it('returns success even if no records found', async () => {
        vi.mocked(prisma.paciente.findUnique).mockResolvedValueOnce(null);

        const result = await anonymizePersonalData('5511999990000');
        expect(result.anonymized).toBe(true);
    });
});
