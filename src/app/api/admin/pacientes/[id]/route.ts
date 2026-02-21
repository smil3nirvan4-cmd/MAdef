import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const PacienteUpdateSchema = z.object({
    nome: z.string().min(1).max(200).optional(),
    cidade: z.string().max(200).optional(),
    bairro: z.string().max(200).optional(),
    tipo: z.string().max(50).optional(),
    hospital: z.string().max(200).optional(),
    quarto: z.string().max(50).optional(),
    status: z.string().max(50).optional(),
    prioridade: z.string().max(50).optional(),
}).strict();

const getHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const paciente = await prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
                orcamentos: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                alocacoes: {
                    include: { cuidador: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                },
            },
        });

        if (!paciente) {
            return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
        }

        // Buscar mensagens adicionais pelo telefone (não linkadas por pacienteId)
        const mensagensPorTelefone = await prisma.mensagem.findMany({
            where: {
                telefone: paciente.telefone,
                pacienteId: null,
            },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });

        // Buscar submissões de formulário pelo telefone
        const formSubmissions = await prisma.formSubmission.findMany({
            where: { telefone: paciente.telefone },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // Combinar mensagens e deduplicar via Set
        const seenIds = new Set<string>();
        const mensagensUnicas = [
            ...(paciente.mensagens || []),
            ...mensagensPorTelefone,
        ]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .filter((msg) => {
                if (seenIds.has(msg.id)) return false;
                seenIds.add(msg.id);
                return true;
            });

        return ok({
            paciente: {
                ...paciente,
                mensagens: mensagensUnicas,
                formSubmissions,
            },
        });
    } catch (error) {
        await logger.error('paciente_get', 'Erro ao buscar paciente', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao buscar paciente', { status: 500 });
    }
};

const patchHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const body = await request.json();

        const parsed = PacienteUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return fail(E.VALIDATION_ERROR, 'Dados inválidos', {
                status: 400,
                details: parsed.error.issues,
            });
        }

        const updateData = parsed.data;
        if (Object.keys(updateData).length === 0) {
            return fail(E.VALIDATION_ERROR, 'Nenhum campo para atualizar', { status: 400 });
        }

        const existing = await prisma.paciente.findUnique({ where: { id } });
        if (!existing) {
            return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
        }

        const paciente = await prisma.paciente.update({
            where: { id },
            data: updateData,
        });

        const pacienteCompleto = await prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
                orcamentos: { orderBy: { createdAt: 'desc' }, take: 20 },
                alocacoes: { include: { cuidador: true }, orderBy: { createdAt: 'desc' }, take: 20 },
                mensagens: { orderBy: { timestamp: 'desc' }, take: 100 },
            },
        });

        await logger.info('paciente_update', `Paciente ${id} atualizado`, {
            pacienteId: id,
            fields: Object.keys(updateData),
        });

        return ok({ paciente: pacienteCompleto || paciente });
    } catch (error) {
        await logger.error('paciente_update', 'Erro ao atualizar paciente', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao atualizar paciente', { status: 500 });
    }
};

export const GET = withRequestContext(getHandler as any);
export const PATCH = withRequestContext(patchHandler as any);
