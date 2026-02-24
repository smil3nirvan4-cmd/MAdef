import { NextRequest, NextResponse } from 'next/server';
import { pacienteRepository } from '@/lib/repositories/paciente.repository';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { z } from 'zod';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';

async function handleGet(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const paciente = await pacienteRepository.findById(id);

    if (!paciente) {
        return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
    }

    // Buscar mensagens adicionais pelo telefone (caso não estejam linkadas por pacienteId)
    const mensagensPorTelefone = await pacienteRepository.findUnlinkedMessages(paciente.telefone);

    // Buscar submissões de formulário pelo telefone
    const formSubmissions = await pacienteRepository.findFormSubmissions(paciente.telefone);

    // Combinar mensagens (linkadas + por telefone)
    const todasMensagens = [
        ...(paciente.mensagens || []),
        ...mensagensPorTelefone
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Remover duplicatas
    const mensagensUnicas = todasMensagens.filter((msg, index, self) =>
        index === self.findIndex(m => m.id === msg.id)
    );

    return ok({
        paciente: {
            ...paciente,
            mensagens: mensagensUnicas,
            formSubmissions
        }
    });
}

const patchSchema = z.object({
    nome: z.string().optional(),
    cidade: z.string().optional(),
    bairro: z.string().optional(),
    tipo: z.string().optional(),
    hospital: z.string().optional(),
    quarto: z.string().optional(),
    status: z.string().optional(),
    prioridade: z.string().optional(),
});

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const body = await parseBody(request, patchSchema);
    if (isFailResponse(body)) return body;

    const existing = await pacienteRepository.findById(id);
    if (!existing) {
        return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
    }

    await pacienteRepository.update(id, {
        ...(body.nome && { nome: body.nome }),
        ...(body.cidade && { cidade: body.cidade }),
        ...(body.bairro && { bairro: body.bairro }),
        ...(body.tipo && { tipo: body.tipo }),
        ...(body.hospital && { hospital: body.hospital }),
        ...(body.quarto && { quarto: body.quarto }),
        ...(body.status && { status: body.status }),
        ...(body.prioridade && { prioridade: body.prioridade }),
    });

    const pacienteCompleto = await pacienteRepository.findById(id);

    return ok({ paciente: pacienteCompleto });
}

export const GET = withErrorBoundary(handleGet);
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
