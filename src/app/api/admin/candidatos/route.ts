import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cuidadorRepository } from '@/lib/repositories';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const createCandidatoSchema = z.object({
    nome: z.string().optional(),
    telefone: z.string().min(1),
    area: z.string().optional(),
    endereco: z.string().optional(),
    competencias: z.string().optional(),
});

export const dynamic = 'force-dynamic';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_RH');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const area = searchParams.get('area');
    const search = searchParams.get('search');

    // When a specific status is selected, use it directly; otherwise fetch
    // pending candidates by making individual calls per default status.
    let cuidadores;
    if (status && status !== 'ALL') {
        const result = await cuidadorRepository.findAll({
            status,
            area: area && area !== 'ALL' ? area : undefined,
            search: search || undefined,
            pageSize: 200,
        });
        cuidadores = result.data;
    } else {
        // Default: show pending candidates (AGUARDANDO_RH, EM_ENTREVISTA, CRIADO)
        const [aguardando, entrevista, criado] = await Promise.all([
            cuidadorRepository.findAll({
                status: 'AGUARDANDO_RH',
                area: area && area !== 'ALL' ? area : undefined,
                search: search || undefined,
                pageSize: 200,
            }),
            cuidadorRepository.findAll({
                status: 'EM_ENTREVISTA',
                area: area && area !== 'ALL' ? area : undefined,
                search: search || undefined,
                pageSize: 200,
            }),
            cuidadorRepository.findAll({
                status: 'CRIADO',
                area: area && area !== 'ALL' ? area : undefined,
                search: search || undefined,
                pageSize: 200,
            }),
        ]);
        cuidadores = [...aguardando.data, ...entrevista.data, ...criado.data]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 200);
    }

    const statusCounts = await cuidadorRepository.countByStatus();
    const stats = {
        total: statusCounts.total,
        aguardandoRH: statusCounts.aguardando,
        emEntrevista: statusCounts.entrevista,
        aprovados: statusCounts.aprovado,
        rejeitados: statusCounts.rejeitado,
    };

    return NextResponse.json({ cuidadores, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, createCandidatoSchema);
    if (error) return error;
    const { nome, telefone, area, endereco, competencias } = data;

    const existing = await cuidadorRepository.findByPhone(telefone);
    if (existing) {
        return NextResponse.json({ error: 'Cuidador já cadastrado' }, { status: 400 });
    }

    const cuidador = await cuidadorRepository.create({
        nome, telefone, area, endereco, competencias, status: 'CRIADO',
    });

    return NextResponse.json({ success: true, cuidador });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
