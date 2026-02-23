import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/audit.service';

export type SubjectType = 'PACIENTE' | 'CUIDADOR';

export interface ConsentInput {
    subjectType: SubjectType;
    subjectId: string;
    purpose: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
}

export async function recordConsent(input: ConsentInput): Promise<void> {
    await prisma.consentRecord.create({
        data: {
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            purpose: input.purpose,
            granted: input.granted,
            ipAddress: input.ipAddress || null,
            userAgent: input.userAgent || null,
            revokedAt: input.granted ? null : new Date(),
        },
    });
}

export async function revokeConsent(subjectType: SubjectType, subjectId: string, purpose: string): Promise<void> {
    const existing = await prisma.consentRecord.findFirst({
        where: { subjectType, subjectId, purpose, granted: true, revokedAt: null },
        orderBy: { createdAt: 'desc' },
    });
    if (existing) {
        await prisma.consentRecord.update({
            where: { id: existing.id },
            data: { revokedAt: new Date(), granted: false },
        });
    }
}

export async function getConsents(subjectType: SubjectType, subjectId: string) {
    return prisma.consentRecord.findMany({
        where: { subjectType, subjectId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function hasActiveConsent(subjectType: SubjectType, subjectId: string, purpose: string): Promise<boolean> {
    const record = await prisma.consentRecord.findFirst({
        where: { subjectType, subjectId, purpose, granted: true, revokedAt: null },
    });
    return Boolean(record);
}

export async function exportSubjectData(subjectType: SubjectType, subjectId: string): Promise<Record<string, unknown>> {
    if (subjectType === 'PACIENTE') {
        const paciente = await prisma.paciente.findUnique({
            where: { id: subjectId },
            include: {
                avaliacoes: true,
                orcamentos: true,
                alocacoes: true,
                mensagens: { select: { id: true, telefone: true, direcao: true, conteudo: true, timestamp: true } },
            },
        });
        if (!paciente) throw new Error('Paciente not found');

        const consents = await getConsents(subjectType, subjectId);
        return { ...paciente, consents, exportedAt: new Date().toISOString() };
    }

    if (subjectType === 'CUIDADOR') {
        const cuidador = await prisma.cuidador.findUnique({
            where: { id: subjectId },
            include: {
                alocacoes: true,
                mensagens: { select: { id: true, telefone: true, direcao: true, conteudo: true, timestamp: true } },
            },
        });
        if (!cuidador) throw new Error('Cuidador not found');

        const consents = await getConsents(subjectType, subjectId);
        return { ...cuidador, consents, exportedAt: new Date().toISOString() };
    }

    throw new Error(`Invalid subject type: ${subjectType}`);
}

export async function anonymizeSubjectData(
    subjectType: SubjectType,
    subjectId: string,
    userId?: string,
    userEmail?: string,
): Promise<void> {
    const anonymized = `[ANONIMIZADO_${Date.now()}]`;

    if (subjectType === 'PACIENTE') {
        await prisma.paciente.update({
            where: { id: subjectId },
            data: {
                nome: anonymized,
                telefone: `anon_${subjectId}`,
                cidade: null,
                bairro: null,
                hospital: null,
                quarto: null,
                deletedAt: new Date(),
            },
        });

        await prisma.mensagem.updateMany({
            where: { pacienteId: subjectId },
            data: { conteudo: anonymized },
        });
    } else if (subjectType === 'CUIDADOR') {
        await prisma.cuidador.update({
            where: { id: subjectId },
            data: {
                nome: anonymized,
                telefone: `anon_${subjectId}`,
                area: null,
                endereco: null,
                competencias: null,
                deletedAt: new Date(),
            },
        });

        await prisma.mensagem.updateMany({
            where: { cuidadorId: subjectId },
            data: { conteudo: anonymized },
        });
    }

    await logAudit({
        entity: subjectType,
        entityId: subjectId,
        action: 'LGPD_ANONYMIZE',
        userId,
        userEmail,
    });
}
