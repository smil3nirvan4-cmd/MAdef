import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate, mockFindFirst, mockFindMany, mockUpdate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        consentRecord: {
            create: mockCreate,
            findFirst: mockFindFirst,
            findMany: mockFindMany,
            update: mockUpdate,
        },
    },
}));

import { grantConsent, revokeConsent, getConsents, hasActiveConsent } from './consent.service';

describe('grantConsent', () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });

    it('creates a consent record with granted=true and grantedAt', async () => {
        const now = new Date();
        const created = {
            id: 'cr-1',
            pacienteId: 'p-1',
            purpose: 'MARKETING',
            granted: true,
            grantedAt: now,
            revokedAt: null,
            ipAddress: '127.0.0.1',
            createdAt: now,
            updatedAt: now,
        };
        mockCreate.mockResolvedValue(created);

        const result = await grantConsent('p-1', 'MARKETING', '127.0.0.1');

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                pacienteId: 'p-1',
                purpose: 'MARKETING',
                granted: true,
                grantedAt: expect.any(Date),
                ipAddress: '127.0.0.1',
            },
        });
        expect(result).toEqual(created);
    });

    it('passes null ipAddress when not provided', async () => {
        mockCreate.mockResolvedValue({ id: 'cr-2' });

        await grantConsent('p-1', 'DADOS_SAUDE');

        expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ipAddress: null,
            }),
        });
    });
});

describe('revokeConsent', () => {
    beforeEach(() => {
        mockFindFirst.mockReset();
        mockUpdate.mockReset();
    });

    it('sets revokedAt on the active consent record', async () => {
        const activeRecord = {
            id: 'cr-1',
            pacienteId: 'p-1',
            purpose: 'MARKETING',
            granted: true,
            revokedAt: null,
        };
        mockFindFirst.mockResolvedValue(activeRecord);

        const updated = { ...activeRecord, revokedAt: new Date() };
        mockUpdate.mockResolvedValue(updated);

        const result = await revokeConsent('p-1', 'MARKETING');

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: {
                pacienteId: 'p-1',
                purpose: 'MARKETING',
                granted: true,
                revokedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'cr-1' },
            data: { revokedAt: expect.any(Date) },
        });
        expect(result).toEqual(updated);
    });

    it('returns null when no active consent exists', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await revokeConsent('p-1', 'MARKETING');

        expect(result).toBeNull();
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});

describe('getConsents', () => {
    beforeEach(() => {
        mockFindMany.mockReset();
    });

    it('returns all consent records for a patient ordered by createdAt desc', async () => {
        const records = [
            { id: 'cr-2', pacienteId: 'p-1', purpose: 'DADOS_SAUDE', granted: true },
            { id: 'cr-1', pacienteId: 'p-1', purpose: 'MARKETING', granted: true },
        ];
        mockFindMany.mockResolvedValue(records);

        const result = await getConsents('p-1');

        expect(mockFindMany).toHaveBeenCalledWith({
            where: { pacienteId: 'p-1' },
            orderBy: { createdAt: 'desc' },
        });
        expect(result).toEqual(records);
    });

    it('returns empty array when patient has no consents', async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await getConsents('p-nonexistent');

        expect(result).toEqual([]);
    });
});

describe('hasActiveConsent', () => {
    beforeEach(() => {
        mockFindFirst.mockReset();
    });

    it('returns true when an active consent exists', async () => {
        mockFindFirst.mockResolvedValue({
            id: 'cr-1',
            pacienteId: 'p-1',
            purpose: 'COMUNICACAO_WHATSAPP',
            granted: true,
            revokedAt: null,
        });

        const result = await hasActiveConsent('p-1', 'COMUNICACAO_WHATSAPP');

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: {
                pacienteId: 'p-1',
                purpose: 'COMUNICACAO_WHATSAPP',
                granted: true,
                revokedAt: null,
            },
        });
        expect(result).toBe(true);
    });

    it('returns false when no active consent exists', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await hasActiveConsent('p-1', 'MARKETING');

        expect(result).toBe(false);
    });

    it('returns false for a revoked consent', async () => {
        // findFirst returns null because the where clause filters out revoked records
        mockFindFirst.mockResolvedValue(null);

        const result = await hasActiveConsent('p-1', 'DADOS_SAUDE');

        expect(result).toBe(false);
    });
});
