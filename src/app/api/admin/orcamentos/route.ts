import { NextRequest, NextResponse } from 'next/server';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import { getPricingConfigSnapshot } from '@/lib/pricing/config-service';
import { computeInputHash } from '@/lib/pricing/input-hash';
import { z } from 'zod';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const scenarioSnapshotSchema = z.object({
    input: z.unknown(),
    output: z.unknown(),
    unidadeId: z.string().optional(),
    configVersionId: z.string().optional(),
    moeda: z.string().optional(),
});

const createOrcamentoSchema = z.object({
    pacienteId: z.string().min(1),
    avaliacaoId: z.string().optional(),
    cenarioEconomico: z.string().nullable().optional(),
    cenarioRecomendado: z.string().nullable().optional(),
    cenarioPremium: z.string().nullable().optional(),
    cenarioSelecionado: z.enum(['economico', 'recomendado', 'premium']).default('recomendado'),
    valorFinal: z.number().nullable().optional(),
    status: z.string().default('RASCUNHO'),
    unidadeId: z.string().optional(),
    configVersionId: z.string().optional(),
    moeda: z.string().optional(),
    snapshotInput: z.string().nullable().optional(),
    snapshotOutput: z.string().nullable().optional(),
    planningInput: z.unknown().optional(),
    normalizedSchedule: z.unknown().optional(),
    pricingBreakdown: z.unknown().optional(),
    engineVersion: z.string().optional(),
    calculationHash: z.string().optional(),
    descontoManualPercent: z.number().min(0).nullable().optional(),
    minicustosDesativados: z.array(z.string()).optional(),
    snapshotsByScenario: z.object({
        economico: scenarioSnapshotSchema.optional(),
        recomendado: scenarioSnapshotSchema.optional(),
        premium: scenarioSnapshotSchema.optional(),
    }).optional(),
});

type ScenarioKey = 'economico' | 'recomendado' | 'premium';

function parseScenarioKey(value: string | null | undefined): ScenarioKey {
    const normalized = String(value || 'recomendado').trim().toLowerCase();
    if (normalized === 'economico') return 'economico';
    if (normalized === 'premium') return 'premium';
    return 'recomendado';
}

function toJsonString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

async function handleGet() {
    const guard = await guardCapability('VIEW_ORCAMENTOS');
    if (guard instanceof NextResponse) {
        return guard;
    }

    const orcamentos = await prisma.orcamento.findMany({
        include: {
            paciente: {
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json({ success: true, data: orcamentos, orcamentos });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) {
        return guard;
    }

    const { data: parsedData, error } = await parseBody(request, createOrcamentoSchema);
    if (error) return error;

    const data = parsedData;
    const selectedScenario = parseScenarioKey(data.cenarioSelecionado);
    const scenarioSnapshot = data.snapshotsByScenario?.[selectedScenario];
    const fallbackConfig = (!data.unidadeId || !data.configVersionId || !data.moeda)
        ? await getPricingConfigSnapshot()
        : null;
    const unidadeId = data.unidadeId ?? scenarioSnapshot?.unidadeId ?? fallbackConfig?.unidadeId ?? null;
    const configVersionId = data.configVersionId ?? scenarioSnapshot?.configVersionId ?? fallbackConfig?.configVersionId ?? null;
    const moeda = data.moeda ?? scenarioSnapshot?.moeda ?? fallbackConfig?.currency ?? 'BRL';
    const snapshotInput = data.snapshotInput ?? toJsonString(scenarioSnapshot?.input);
    const snapshotOutput = data.snapshotOutput ?? toJsonString(scenarioSnapshot?.output);
    const planningInput = toJsonString(data.planningInput);
    const normalizedSchedule = toJsonString(data.normalizedSchedule);
    const pricingBreakdown = toJsonString(data.pricingBreakdown);
    const engineVersion = data.engineVersion ?? null;
    const calculationHash = data.calculationHash ?? computeInputHash({
        snapshotInput,
        snapshotOutput,
        planningInput,
        normalizedSchedule,
        pricingBreakdown,
        configVersionId,
        selectedScenario,
    });

    const orcamento = await prisma.orcamento.create({
        data: {
            pacienteId: data.pacienteId,
            unidadeId,
            configVersionId,
            avaliacaoId: data.avaliacaoId ?? null,
            cenarioEconomico: data.cenarioEconomico ?? null,
            cenarioRecomendado: data.cenarioRecomendado ?? null,
            cenarioPremium: data.cenarioPremium ?? null,
            cenarioSelecionado: selectedScenario,
            valorFinal: data.valorFinal ?? null,
            snapshotInput,
            snapshotOutput,
            planningInput,
            normalizedSchedule,
            pricingBreakdown,
            engineVersion,
            calculationHash,
            descontoManualPercent: data.descontoManualPercent ?? null,
            minicustosDesativados: data.minicustosDesativados?.length
                ? JSON.stringify(data.minicustosDesativados)
                : null,
            moeda,
            status: data.status,
        },
        include: {
            paciente: true,
        },
    });

    return NextResponse.json({ success: true, data: orcamento, orcamento });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
