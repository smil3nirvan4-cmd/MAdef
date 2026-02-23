import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';

export async function GET(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_USERS');
        if (guard instanceof NextResponse) return guard;

        // Buscar pacientes com mensagens
        const pacientes = await prisma.paciente.findMany({
            include: {
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 50,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Buscar cuidadores com mensagens
        const cuidadores = await prisma.cuidador.findMany({
            include: {
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 50,
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalizar para formato único
        const usuarios = [
            ...pacientes.map((p) => ({
                id: p.id,
                nome: p.nome || 'Sem nome',
                telefone: p.telefone,
                tipo: 'PACIENTE' as const,
                status: p.status,
                mensagens: p.mensagens.map(m => ({
                    id: m.id,
                    conteudo: m.conteudo,
                    direcao: m.direcao,
                    flow: m.flow,
                    step: m.step,
                    createdAt: m.timestamp.toISOString(),
                })),
                createdAt: p.createdAt.toISOString(),
            })),
            ...cuidadores.map((c) => ({
                id: c.id,
                nome: c.nome || 'Sem nome',
                telefone: c.telefone,
                tipo: 'CUIDADOR' as const,
                status: c.status,
                mensagens: c.mensagens.map(m => ({
                    id: m.id,
                    conteudo: m.conteudo,
                    direcao: m.direcao,
                    flow: m.flow,
                    step: m.step,
                    createdAt: m.timestamp.toISOString(),
                })),
                createdAt: c.createdAt.toISOString(),
            })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ usuarios });
    } catch (error) {
        await logger.error('usuario_fetch_error', 'Erro ao buscar usuários', error instanceof Error ? error : undefined);
        return NextResponse.json(
            { error: 'Falha ao buscar usuários', details: String(error) },
            { status: 500 }
        );
    }
}
