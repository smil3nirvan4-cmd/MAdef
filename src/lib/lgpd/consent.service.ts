import { prisma } from '@/lib/prisma';

/**
 * Grant consent for a specific purpose.
 * Creates a new ConsentRecord with granted=true.
 */
export async function grantConsent(
    pacienteId: string,
    purpose: string,
    ipAddress?: string,
) {
    return prisma.consentRecord.create({
        data: {
            pacienteId,
            purpose,
            granted: true,
            grantedAt: new Date(),
            ipAddress: ipAddress ?? null,
        },
    });
}

/**
 * Revoke an active consent for a specific purpose.
 * Sets revokedAt on the most recent active (granted && not revoked) consent.
 */
export async function revokeConsent(
    pacienteId: string,
    purpose: string,
) {
    const active = await prisma.consentRecord.findFirst({
        where: {
            pacienteId,
            purpose,
            granted: true,
            revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!active) return null;

    return prisma.consentRecord.update({
        where: { id: active.id },
        data: { revokedAt: new Date() },
    });
}

/**
 * List all consent records for a patient.
 */
export async function getConsents(pacienteId: string) {
    return prisma.consentRecord.findMany({
        where: { pacienteId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Check whether a patient has an active (granted and not revoked) consent
 * for the given purpose.
 */
export async function hasActiveConsent(
    pacienteId: string,
    purpose: string,
): Promise<boolean> {
    const record = await prisma.consentRecord.findFirst({
        where: {
            pacienteId,
            purpose,
            granted: true,
            revokedAt: null,
        },
    });

    return record !== null;
}
