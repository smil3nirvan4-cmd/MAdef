import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit/audit.service';

/**
 * Export all data related to a patient (LGPD data portability).
 * Returns a plain object with every domain entity linked to the patient.
 */
export async function exportPacienteData(pacienteId: string) {
    const paciente = await prisma.paciente.findUnique({
        where: { id: pacienteId },
        include: {
            avaliacoes: true,
            orcamentos: true,
            alocacoes: true,
            mensagens: true,
            consentRecords: true,
        },
    });

    if (!paciente) return null;

    return {
        paciente: {
            id: paciente.id,
            telefone: paciente.telefone,
            nome: paciente.nome,
            cidade: paciente.cidade,
            bairro: paciente.bairro,
            tipo: paciente.tipo,
            hospital: paciente.hospital,
            quarto: paciente.quarto,
            status: paciente.status,
            prioridade: paciente.prioridade,
            gqpScore: paciente.gqpScore,
            createdAt: paciente.createdAt,
            updatedAt: paciente.updatedAt,
        },
        avaliacoes: paciente.avaliacoes,
        orcamentos: paciente.orcamentos,
        alocacoes: paciente.alocacoes,
        mensagens: paciente.mensagens,
        consentRecords: paciente.consentRecords,
    };
}

/**
 * Anonymize a patient record (LGPD right to erasure).
 * Replaces identifiable fields with anonymous placeholders and logs an audit entry.
 */
export async function anonymizePaciente(pacienteId: string) {
    const paciente = await prisma.paciente.findUnique({
        where: { id: pacienteId },
    });

    if (!paciente) return null;

    const updated = await prisma.paciente.update({
        where: { id: pacienteId },
        data: {
            nome: 'ANONIMIZADO',
            telefone: `anon_${pacienteId}`,
            cidade: null,
            bairro: null,
            hospital: null,
            quarto: null,
            deletedAt: new Date(),
        },
    });

    await logAudit({
        entity: 'Paciente',
        entityId: pacienteId,
        action: 'ANONYMIZE',
        changes: {
            nome: { from: paciente.nome, to: 'ANONIMIZADO' },
            telefone: { from: paciente.telefone, to: `anon_${pacienteId}` },
        },
    });

    return updated;
}
