import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { generatePropostaPDF } from '@/lib/documents/pdf-generator';
import { sendDocumentViaBridge } from '@/lib/documents/whatsapp-documents';
import { renderCommercialMessage } from '@/lib/documents/commercial-message';
import type { OrcamentoSendOptions } from '@/lib/documents/send-options';
import { autoCorrectBrazilianPhone, validateBrazilianPhone } from '@/lib/phone-validator';

type ScenarioKey = 'economico' | 'recomendado' | 'premium';

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
}

function toJsonString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

function toFiniteNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function stringOr(value: unknown, fallback = ''): string {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
}

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function toScenarioKey(value: unknown): ScenarioKey {
    const normalized = String(value || 'recomendado').trim().toLowerCase();
    if (normalized === 'economico') return 'economico';
    if (normalized === 'premium') return 'premium';
    return 'recomendado';
}

function formatDateLabel(value: unknown): string {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) return String(value || 'Dia');
    return parsed.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
    });
}

function formatTimeLabel(value: unknown): string | null {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function normalizeScenarioForStorage(args: {
    rawScenario: unknown;
    fallbackName: string;
    defaultTotal: number;
    planejamento360: Record<string, unknown>;
    orcamentoPayload: Record<string, unknown>;
}) {
    const { rawScenario, fallbackName, defaultTotal, planejamento360, orcamentoPayload } = args;
    const scenario = asRecord(rawScenario);
    const scenarioData = asRecord(scenario.data);
    const scenarioMeta = asRecord(scenario.meta);
    const normalizedSchedule = asRecord(scenarioMeta.normalizedSchedule);
    const pricingBreakdown = asRecord(scenarioMeta.pricingBreakdown);
    const breakdown = asRecord(pricingBreakdown.breakdown);

    const totalSemanal = toFiniteNumber(
        scenario.totalSemanal
        ?? scenarioData.totalSemanal
        ?? scenarioData.total
        ?? scenario.valorFinal
        ?? defaultTotal,
    ) ?? defaultTotal;

    const diasAtivos = Math.max(1, Math.round(
        toFiniteNumber(
            scenario.duracaoDias
            ?? normalizedSchedule.totalDaysActive
            ?? normalizedSchedule.totalOccurrences
            ?? orcamentoPayload.duracaoDias
            ?? 7,
        ) ?? 7,
    ));

    const estimativaMensal = toFiniteNumber(
        scenario.estimativaMensal
        ?? scenarioData.estimativaMensal
        ?? ((totalSemanal / diasAtivos) * 30),
    ) ?? ((totalSemanal / diasAtivos) * 30);

    const occurrences = Array.isArray(normalizedSchedule.occurrences)
        ? normalizedSchedule.occurrences as Array<Record<string, unknown>>
        : [];

    const providerTotal = toFiniteNumber(breakdown.custo_profissional)
        ?? (totalSemanal * 0.75);
    const feeTotal = Math.max(0, totalSemanal - providerTotal);
    const count = Math.max(1, occurrences.length);
    const providerPerOccurrence = round2(providerTotal / count);
    const feePerOccurrence = round2(feeTotal / count);

    const horarioInicioPlanejado = String(planejamento360.horarioInicio || '07:00');
    const horarioFimPlanejado = String(planejamento360.horarioFim || '19:00');

    const plantoes = occurrences.length > 0
        ? occurrences.map((occurrence, index) => {
            const startLabel = formatTimeLabel(occurrence.startAt) || horarioInicioPlanejado;
            const endLabel = formatTimeLabel(occurrence.endAt) || horarioFimPlanejado;
            const turno = String(
                occurrence.dayType === 'HOLIDAY'
                    ? 'Feriado'
                    : occurrence.dayType === 'WEEKEND'
                        ? 'FDS'
                        : planejamento360.turno || 'Diurno',
            );
            return {
                numero: index + 1,
                dia: formatDateLabel(occurrence.date),
                horario: `${startLabel}-${endLabel}`,
                turno,
                cuidador: `C${(index % 6) + 1}`,
                valorCuidador: providerPerOccurrence,
                taxaMA: feePerOccurrence,
                total: round2(providerPerOccurrence + feePerOccurrence),
            };
        })
        : [{
            numero: 1,
            dia: 'Periodo',
            horario: `${horarioInicioPlanejado}-${horarioFimPlanejado}`,
            turno: String(planejamento360.turno || 'Diurno'),
            cuidador: 'C1',
            valorCuidador: round2(providerTotal),
            taxaMA: round2(feeTotal),
            total: round2(totalSemanal),
        }];

    const descontoManual = Math.max(0, toFiniteNumber(orcamentoPayload.descontos) ?? 0);
    const descontoPercent = Math.max(0, toFiniteNumber(planejamento360.descontoManualPercent) ?? 0);

    return {
        nome: String(scenario.label || scenario.nome || fallbackName),
        totalSemanal: round2(totalSemanal),
        estimativaMensal: round2(estimativaMensal),
        plantoes,
        parametros: {
            r0: Math.max(0, toFiniteNumber(orcamentoPayload.valorBase) ?? (providerTotal / Math.max(1, diasAtivos))),
            a2p: Math.max(0, (Math.max(1, Number(planejamento360.quantidadePacientes || 1)) - 1) * 50),
            an: String(planejamento360.turno || '').toUpperCase() === 'NOTURNO' ? 20 : 0,
            afds: 20,
            metodoPagamento: Number(orcamentoPayload.parcelas || 1) > 1 ? 'Cartao' : 'Pix',
            periodo: String(planejamento360.periodicidade || 'Semanal'),
        },
        descontos: [
            ...(descontoPercent > 0 ? [{ periodo: 'Manual %', percentual: round2(descontoPercent) }] : []),
            ...(descontoManual > 0 && totalSemanal > 0 ? [{
                periodo: 'Manual R$',
                percentual: round2((descontoManual / totalSemanal) * 100),
            }] : []),
        ],
        coberturaInicio: horarioInicioPlanejado,
        coberturaFim: horarioFimPlanejado,
        numeroPacientes: Math.max(1, Number(planejamento360.quantidadePacientes || 1)),
        condicaoClinica: String(scenario.complexidade || orcamentoPayload.complexidade || 'N/A'),
        profissionalMinimo: String(scenario.tipoProfissional || orcamentoPayload.tipoProfissional || 'CUIDADOR'),
        meta: {
            scenarioKey: scenario.key || null,
            inputHash: scenarioMeta.inputHash || null,
            configVersionId: scenarioMeta.configVersionId || null,
            engineVersion: scenarioMeta.engineVersion || null,
            normalizedSchedule: normalizedSchedule || null,
            pricingBreakdown: pricingBreakdown || null,
        },
    };
}

function isMissingColumnError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2022');
}

async function loadOrcamentoAvailableColumns(databaseProvider: string): Promise<Set<string>> {
    if (databaseProvider === 'postgresql') {
        const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
            `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = $1
            `,
            'Orcamento',
        );
        return new Set(rows.map((row) => String(row.column_name)));
    }

    const rows = await prisma.$queryRaw<Array<{ name: string }>>`
        PRAGMA table_info("Orcamento")
    `;
    return new Set(rows.map((row) => String(row.name)));
}

async function persistOrcamentoWithLegacyFallback(
    createData: Prisma.OrcamentoUncheckedCreateInput,
): Promise<void> {
    const schemaCapabilities = await getDbSchemaCapabilities();

    if (schemaCapabilities.dbSchemaOk) {
        try {
            await prisma.orcamento.create({ data: createData });
            return;
        } catch (error) {
            if (!isMissingColumnError(error)) throw error;
        }
    }

    const refreshedCapabilities = await getDbSchemaCapabilities({ forceRefresh: true });
    if (refreshedCapabilities.dbSchemaOk) {
        await prisma.orcamento.create({ data: createData });
        return;
    }

    const availableColumns = await loadOrcamentoAvailableColumns(refreshedCapabilities.databaseProvider);

    try {
        const rawData: Record<string, unknown> = { ...createData };

        if (availableColumns.has('id') && !rawData.id) {
            rawData.id = `orc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        }
        if (availableColumns.has('status') && !rawData.status) {
            rawData.status = 'RASCUNHO';
        }
        if (availableColumns.has('createdAt') && !rawData.createdAt) {
            rawData.createdAt = new Date().toISOString();
        }

        const values = Object.entries(rawData)
            .filter(([key, value]) => availableColumns.has(key) && value !== undefined)
            .map(([key, value]) => [key, value] as const);

        if (values.length === 0) {
            throw new Error('Nao foi possivel persistir orcamento: tabela Orcamento sem colunas compativeis.');
        }

        const columnsSql = values.map(([key]) => `"${key}"`).join(', ');
        const placeholdersSql = values.map(() => '?').join(', ');
        const sqlValues = values.map(([, value]) => value instanceof Date ? value.toISOString() : value);

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Orcamento" (${columnsSql}) VALUES (${placeholdersSql})`,
            ...sqlValues,
        );

        await logger.warning(
            'db_schema_drift',
            'Persistencia em Orcamento via fallback legado (schema desatualizado)',
            {
                persistedColumns: values.map(([key]) => key),
                missingColumns: refreshedCapabilities.missingColumns,
                databaseProvider: refreshedCapabilities.databaseProvider,
            },
        );
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            phone,
            nome,
            email,
            valorTotal,
            entrada,
            parcelas,
            valorParcela,
            vencimento,
            descontos,
            acrescimos,
            metodosPagamento,
            opcoesParcelamento,
            dadosDetalhados,
        } = body;

        console.log('Recebendo payload completo:', { nome, phone, hasDetails: !!dadosDetalhados });

        if (!phone || !nome) {
            throw new Error('Nome e Telefone sao obrigatorios para salvar a avaliacao.');
        }

        // Auto-correct truncated mobile numbers (e.g., 4591233799 → 45991233799)
        const phoneCorrection = autoCorrectBrazilianPhone(phone);
        const correctedPhone = phoneCorrection.wasCorrected
            ? `55${phoneCorrection.corrected}`
            : phone;

        // Validate the phone number
        const phoneValidation = validateBrazilianPhone(correctedPhone);
        if (!phoneValidation.isValid) {
            await logger.warning('proposta_telefone_invalido', `Telefone invalido: ${phone} - ${phoneValidation.error}`, {
                phone,
                correctedPhone,
                error: phoneValidation.error,
            });
        }

        // Use corrected phone (E164 format if valid)
        const normalizedPhone = phoneValidation.isValid ? phoneValidation.whatsapp : correctedPhone;

        if (phoneCorrection.wasCorrected) {
            await logger.info('phone_auto_corrected', `Telefone corrigido automaticamente: ${phone} → ${normalizedPhone}`, {
                original: phone,
                corrected: normalizedPhone,
            });
        }

        let paciente = await prisma.paciente.findUnique({ where: { telefone: normalizedPhone } });
        if (!paciente) {
            paciente = await prisma.paciente.create({
                data: {
                    nome: nome || stringOr(asRecord(asRecord(dadosDetalhados).patient).nome, 'Novo Paciente'),
                    telefone: normalizedPhone,
                    status: 'AVALIACAO',
                },
            });
        }

        const dadosDetalhadosRecord = asRecord(dadosDetalhados);
        const novaAvaliacao = await prisma.avaliacao.create({
            data: {
                pacienteId: paciente.id,
                status: 'ENVIADA',
                dadosDetalhados: JSON.stringify(dadosDetalhados || {}),
                abemidScore: 0,
                nivelSugerido: String(asRecord(dadosDetalhadosRecord.orcamento).complexidade || 'N/A'),
            },
        });

        const orcamentoPayload = asRecord(dadosDetalhadosRecord.orcamento);
        const planejamento360 = asRecord(orcamentoPayload.planejamento360);
        const cenarioSelecionado = toScenarioKey(orcamentoPayload.cenarioSelecionado);
        const valorTotalNumero = toFiniteNumber(valorTotal) ?? 0;

        const cenarioEconomico = normalizeScenarioForStorage({
            rawScenario: orcamentoPayload.cenarioEconomico,
            fallbackName: 'Economico',
            defaultTotal: valorTotalNumero,
            planejamento360,
            orcamentoPayload,
        });
        const cenarioRecomendado = normalizeScenarioForStorage({
            rawScenario: orcamentoPayload.cenarioRecomendado,
            fallbackName: 'Recomendado',
            defaultTotal: valorTotalNumero,
            planejamento360,
            orcamentoPayload,
        });
        const cenarioPremium = normalizeScenarioForStorage({
            rawScenario: orcamentoPayload.cenarioPremium,
            fallbackName: 'Premium',
            defaultTotal: valorTotalNumero,
            planejamento360,
            orcamentoPayload,
        });

        const createData: Prisma.OrcamentoUncheckedCreateInput = {
            pacienteId: paciente.id,
            avaliacaoId: novaAvaliacao.id,
            cenarioEconomico: toJsonString(cenarioEconomico),
            cenarioRecomendado: toJsonString(cenarioRecomendado),
            cenarioPremium: toJsonString(cenarioPremium),
            cenarioSelecionado,
            valorFinal: toFiniteNumber(orcamentoPayload.valorFinal) ?? valorTotalNumero,
            snapshotInput: toJsonString({
                source: 'avaliacao_nova',
                planejamento360: planejamento360 ?? null,
                planejamentoResumoCalculo: orcamentoPayload.planejamentoResumoCalculo ?? null,
                resumoSelecionado: orcamentoPayload.resumoSelecionado ?? null,
            }),
            snapshotOutput: toJsonString({
                resumoSelecionado: orcamentoPayload.resumoSelecionado ?? null,
                complexidade: orcamentoPayload.complexidade ?? null,
                tipoProfissional: orcamentoPayload.tipoProfissional ?? null,
                cargaHoraria: orcamentoPayload.cargaHoraria ?? null,
                vencimento,
                descontos,
                acrescimos,
                dadosDetalhados: dadosDetalhados ?? null,
            }),
            status: 'PROPOSTA_ENVIADA',
            descontoManualPercent: toFiniteNumber(planejamento360.descontoManualPercent),
            minicustosDesativados: toJsonString(
                String(planejamento360.minicustosDesativadosCsv || '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
            ),
        };

        await persistOrcamentoWithLegacyFallback(createData);

        await logger.info('avaliacao_criada', `Nova avaliacao criada para paciente ${paciente.nome}`, {
            avaliacaoId: novaAvaliacao.id,
            pacienteId: paciente.id,
            pacienteTelefone: normalizedPhone,
            valorTotal,
        });

        try {
            const orcamentoPersistido = await prisma.orcamento.findFirst({
                where: { avaliacaoId: novaAvaliacao.id },
                orderBy: { createdAt: 'desc' },
            });

            if (!orcamentoPersistido) {
                await logger.warning('whatsapp_document_error', 'Orcamento nao encontrado apos persistencia para envio de proposta', {
                    phone: normalizedPhone,
                    avaliacaoId: novaAvaliacao.id,
                });
                return NextResponse.json({
                    success: true,
                    whatsappSent: false,
                    whatsappError: 'Orcamento nao encontrado apos persistencia',
                    avaliacaoId: novaAvaliacao.id,
                });
            } else {
                const sendOptions: OrcamentoSendOptions = {
                    cenarioSelecionado,
                    descontoManualPercent: toFiniteNumber(planejamento360.descontoManualPercent) ?? undefined,
                    valorPeriodo: toFiniteNumber(orcamentoPayload.valorBase) ?? valorTotalNumero,
                    valorFinal: toFiniteNumber(orcamentoPayload.valorFinal) ?? valorTotalNumero,
                    descontoValor: toFiniteNumber(descontos) ?? 0,
                    acrescimosValor: toFiniteNumber(acrescimos) ?? 0,
                    dataVencimento: stringOr(vencimento, ''),
                    metodosPagamento: Array.isArray(metodosPagamento) && metodosPagamento.length
                        ? metodosPagamento.map((item: unknown) => stringOr(item, '')).filter(Boolean)
                        : ['PIX', 'CARTAO DE CREDITO'],
                    opcoesParcelamento: Array.isArray(opcoesParcelamento) && opcoesParcelamento.length
                        ? opcoesParcelamento.map((item: unknown) => stringOr(item, '')).filter(Boolean)
                        : ['1x sem juros', '2x sem juros', '3x sem juros', '4x sem juros'],
                    parcelas: Math.max(1, Math.round(toFiniteNumber(parcelas) ?? 1)),
                    entrada: Math.max(0, toFiniteNumber(entrada) ?? 0),
                    valorParcela: Math.max(0, toFiniteNumber(valorParcela) ?? 0),
                    validadeHoras: 24,
                };

                const pdfData = buildOrcamentoPDFData(
                    {
                        ...novaAvaliacao,
                        paciente,
                    } as unknown as Record<string, unknown>,
                    orcamentoPersistido as unknown as Record<string, unknown>,
                    'PROPOSTA',
                    sendOptions,
                );
                const mensagem = renderCommercialMessage({
                    tipo: 'PROPOSTA',
                    pacienteNome: String(nome || paciente.nome || 'Paciente'),
                    pdfData,
                    avaliacao: {
                        ...novaAvaliacao,
                        paciente,
                    } as unknown as Record<string, unknown>,
                    orcamento: orcamentoPersistido as unknown as Record<string, unknown>,
                    sendOptions,
                });
                if (mensagem.missingVariables.length > 0) {
                    throw new Error(`Variaveis ausentes no template: ${mensagem.missingVariables.join(', ')}`);
                }

                const pdfBuffer = await generatePropostaPDF(pdfData);
                const safeReference = pdfData.referencia.replace(/[^A-Za-z0-9_-]/g, '_');
                const envio = await sendDocumentViaBridge({
                    phone: normalizedPhone,
                    fileName: `Proposta_${safeReference}_MaosAmigas.pdf`,
                    caption: mensagem.rendered,
                    buffer: pdfBuffer,
                });

                if (!envio.success) {
                    await logger.warning('whatsapp_document_error', `Falha ao enviar PDF de proposta: ${envio.error || 'erro desconhecido'}`, {
                        phone: normalizedPhone,
                        avaliacaoId: novaAvaliacao.id,
                        providerMessageId: envio.messageId || null,
                        errorCode: envio.errorCode || null,
                    });
                    return NextResponse.json({
                        success: true,
                        whatsappSent: false,
                        whatsappError: envio.error || 'Falha ao enviar proposta via WhatsApp',
                        avaliacaoId: novaAvaliacao.id,
                    });
                } else {
                    await logger.whatsapp('proposta_enviada', `Proposta enviada para ${normalizedPhone}`, {
                        avaliacaoId: novaAvaliacao.id,
                        pacienteId: paciente.id,
                        valorTotal,
                        providerMessageId: envio.messageId || null,
                    });

                    await prisma.paciente.update({
                        where: { id: paciente.id },
                        data: { status: 'PROPOSTA_ENVIADA' },
                    });

                    await prisma.whatsAppFlowState.upsert({
                        where: { phone: normalizedPhone },
                        update: {
                            currentFlow: 'AGUARDANDO_RESPOSTA_PROPOSTA',
                            currentStep: 'ESPERANDO_CONFIRMACAO',
                            data: JSON.stringify({
                                avaliacaoId: novaAvaliacao.id,
                                valorTotal,
                                propostaEnviadaEm: new Date().toISOString(),
                            }),
                            lastInteraction: new Date(),
                        },
                        create: {
                            phone: normalizedPhone,
                            currentFlow: 'AGUARDANDO_RESPOSTA_PROPOSTA',
                            currentStep: 'ESPERANDO_CONFIRMACAO',
                            data: JSON.stringify({
                                avaliacaoId: novaAvaliacao.id,
                                valorTotal,
                                propostaEnviadaEm: new Date().toISOString(),
                            }),
                        },
                    });
                }
            }
        } catch (bridgeError) {
            await logger.error('whatsapp_bridge_offline', 'Bridge offline na porta 4000', bridgeError as Error, {
                phone: normalizedPhone,
                avaliacaoId: novaAvaliacao.id,
            });
            return NextResponse.json({
                success: true,
                whatsappSent: false,
                whatsappError: bridgeError instanceof Error ? bridgeError.message : 'Bridge offline',
                avaliacaoId: novaAvaliacao.id,
            });
        }

        return NextResponse.json({ success: true, whatsappSent: true, avaliacaoId: novaAvaliacao.id });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro fatal ao processar proposta';
        const errorObj = error instanceof Error ? error : new Error(message);
        await logger.error('proposta_erro_fatal', 'Erro fatal ao processar proposta', errorObj, {
            errorMessage: message,
        });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
