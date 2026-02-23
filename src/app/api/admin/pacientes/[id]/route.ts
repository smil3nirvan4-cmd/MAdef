import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const paciente = await prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                },
                orcamentos: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                alocacoes: {
                    include: { cuidador: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 100
                }
            }
        });

        if (!paciente) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
        }

        // Buscar mensagens adicionais pelo telefone (caso não estejam linkadas por pacienteId)
        const mensagensPorTelefone = await prisma.mensagem.findMany({
            where: {
                telefone: paciente.telefone,
                pacienteId: null // Apenas mensagens não linkadas
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        // Buscar submissões de formulário pelo telefone
        const formSubmissions = await prisma.formSubmission.findMany({
            where: { telefone: paciente.telefone },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Combinar mensagens (linkadas + por telefone)
        const todasMensagens = [
            ...(paciente.mensagens || []),
            ...mensagensPorTelefone
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Remover duplicatas
        const mensagensUnicas = todasMensagens.filter((msg, index, self) =>
            index === self.findIndex(m => m.id === msg.id)
        );

        return NextResponse.json({
            paciente: {
                ...paciente,
                mensagens: mensagensUnicas,
                formSubmissions
            }
        });
    } catch (error) {
        await logger.error('paciente_fetch_error', 'Error fetching paciente', error instanceof Error ? error : undefined);
        return NextResponse.json({ error: 'Erro ao buscar paciente' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const existing = await prisma.paciente.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Paciente não encontrado' }, { status: 404 });
        }

        const paciente = await prisma.paciente.update({
            where: { id },
            data: {
                ...(body.nome && { nome: body.nome }),
                ...(body.cidade && { cidade: body.cidade }),
                ...(body.bairro && { bairro: body.bairro }),
                ...(body.tipo && { tipo: body.tipo }),
                ...(body.hospital && { hospital: body.hospital }),
                ...(body.quarto && { quarto: body.quarto }),
                ...(body.status && { status: body.status }),
                ...(body.prioridade && { prioridade: body.prioridade }),
            }
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

        return NextResponse.json({ success: true, paciente: pacienteCompleto || paciente });
    } catch (error) {
        await logger.error('paciente_update_error', 'Error updating paciente', error instanceof Error ? error : undefined);
        return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 });
    }
}
