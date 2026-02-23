import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handleGet(
    request: NextRequest,
    { params }: { params: Promise<{ telefone: string }> }
) {
    try {
        const guard = await guardCapability('VIEW_LOGS');
        if (guard instanceof NextResponse) return guard;

        const { telefone } = await params;

        // Normalizar telefone
        const cleanPhone = telefone.replace(/\D/g, '');

        // Buscar usuário (paciente ou cuidador)
        type UserWithMessages = {
            id: string;
            nome: string | null;
            telefone: string;
            status: string;
            createdAt: Date;
            mensagens: Array<{ id: string; conteudo: string; direcao: string; flow: string | null; step: string | null; timestamp: Date }>;
        };
        let usuario: UserWithMessages | null = await prisma.paciente.findFirst({
            where: {
                telefone: { contains: cleanPhone.slice(-11) },
            },
            include: {
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                },
            },
        });

        let tipo = 'PACIENTE';

        if (!usuario) {
            const cuidador = await prisma.cuidador.findFirst({
                where: {
                    telefone: { contains: cleanPhone.slice(-11) },
                },
                include: {
                    mensagens: {
                        orderBy: { timestamp: 'desc' },
                        take: 100,
                    },
                },
            });

            if (cuidador) {
                usuario = cuidador as UserWithMessages;
                tipo = 'CUIDADOR';
            }
        }

        // Buscar logs relacionados a este telefone
        const logs = await prisma.systemLog.findMany({
            where: {
                OR: [
                    { metadata: { contains: cleanPhone } },
                    { metadata: { contains: cleanPhone.slice(-11) } },
                    { metadata: { contains: cleanPhone.slice(-9) } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({
            usuario: usuario ? {
                id: usuario.id,
                nome: usuario.nome,
                telefone: usuario.telefone,
                tipo,
                status: usuario.status,
                mensagens: usuario.mensagens?.map(m => ({
                    id: m.id,
                    conteudo: m.conteudo,
                    direcao: m.direcao,
                    flow: m.flow,
                    step: m.step,
                    createdAt: m.timestamp.toISOString(),
                })) || [],
                createdAt: usuario.createdAt.toISOString(),
            } : null,
            logs,
            telefone: cleanPhone,
        });
    } catch (error) {
        await logger.error('usuario_logs_fetch_error', 'Erro ao buscar logs do usuário', error instanceof Error ? error : undefined);
        return NextResponse.json(
            { error: 'Falha ao buscar dados', details: String(error) },
            { status: 500 }
        );
    }
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
