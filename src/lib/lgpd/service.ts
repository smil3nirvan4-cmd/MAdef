import { prisma } from '@/lib/prisma';

export type ConsentType = 'TERMS' | 'MARKETING' | 'DATA_PROCESSING' | 'PROFILING';

export interface RecordConsentInput {
    subjectPhone: string;
    tipo: ConsentType;
    consentido: boolean;
    versaoTermos?: string;
    ipAddress?: string;
    userAgent?: string;
}

export async function recordConsent(input: RecordConsentInput) {
    return prisma.consentRecord.create({
        data: {
            subjectPhone: input.subjectPhone,
            tipo: input.tipo,
            consentido: input.consentido,
            versaoTermos: input.versaoTermos ?? '1.0',
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            revokedAt: input.consentido ? null : new Date(),
        },
    });
}

export async function getConsentHistory(phone: string) {
    return prisma.consentRecord.findMany({
        where: { subjectPhone: phone },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getActiveConsents(phone: string) {
    const records = await prisma.consentRecord.findMany({
        where: { subjectPhone: phone },
        orderBy: { createdAt: 'desc' },
    });

    const latest = new Map<string, typeof records[0]>();
    for (const r of records) {
        if (!latest.has(r.tipo)) latest.set(r.tipo, r);
    }
    return Object.fromEntries(
        Array.from(latest.entries()).map(([tipo, r]) => [tipo, r.consentido])
    );
}

export async function exportPersonalData(phone: string) {
    const [paciente, cuidador, mensagens, consents, formSubmissions] = await Promise.all([
        prisma.paciente.findUnique({
            where: { telefone: phone },
            include: { avaliacoes: true, orcamentos: true, alocacoes: true },
        }),
        prisma.cuidador.findUnique({
            where: { telefone: phone },
            include: { alocacoes: true },
        }),
        prisma.mensagem.findMany({ where: { telefone: phone } }),
        prisma.consentRecord.findMany({ where: { subjectPhone: phone } }),
        prisma.formSubmission.findMany({ where: { telefone: phone } }),
    ]);

    return {
        exportedAt: new Date().toISOString(),
        subject: phone,
        paciente,
        cuidador,
        mensagens,
        consents,
        formSubmissions,
    };
}

export async function anonymizePersonalData(phone: string) {
    const anon = `anon_${Date.now()}`;

    const ops: Promise<unknown>[] = [];

    const paciente = await prisma.paciente.findUnique({ where: { telefone: phone } });
    if (paciente) {
        ops.push(
            prisma.paciente.update({
                where: { telefone: phone },
                data: {
                    nome: '[ANONIMIZADO]',
                    telefone: anon,
                    cidade: null,
                    bairro: null,
                    hospital: null,
                    quarto: null,
                    deletedAt: new Date(),
                },
            })
        );
    }

    const cuidador = await prisma.cuidador.findUnique({ where: { telefone: phone } });
    if (cuidador) {
        ops.push(
            prisma.cuidador.update({
                where: { telefone: phone },
                data: {
                    nome: '[ANONIMIZADO]',
                    telefone: anon + '_c',
                    endereco: null,
                    deletedAt: new Date(),
                },
            })
        );
    }

    ops.push(
        prisma.mensagem.updateMany({
            where: { telefone: phone },
            data: { conteudo: '[CONTEUDO REMOVIDO POR LGPD]' },
        })
    );

    ops.push(
        prisma.formSubmission.updateMany({
            where: { telefone: phone },
            data: { dados: '{}', ipAddress: null, userAgent: null },
        })
    );

    await Promise.all(ops);
    return { anonymized: true, phone, timestamp: new Date().toISOString() };
}
