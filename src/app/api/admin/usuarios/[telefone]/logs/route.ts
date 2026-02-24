import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(
    request: NextRequest,
    { params }: { params: Promise<{ telefone: string }> }
) {
    const guard = await guardCapability('VIEW_LOGS');
    if (guard instanceof NextResponse) return guard;

    try {
        const { telefone } = await params;

        // Normalizar telefone
        const cleanPhone = telefone.replace(/\D/g, '');

        // Buscar usuário (paciente ou cuidador)
        let usuario = await prisma.paciente.findFirst({
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
                usuario = cuidador as any;
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
        console.error('Erro ao buscar logs do usuário:', error);
        return NextResponse.json(
            { error: 'Falha ao buscar dados', details: String(error) },
            { status: 500 }
        );
    }
}

export const GET = withErrorBoundary(handleGet);
