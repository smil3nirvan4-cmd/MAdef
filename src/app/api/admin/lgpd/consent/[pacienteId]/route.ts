import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';
import { getConsents, grantConsent, revokeConsent } from '@/lib/lgpd/consent.service';

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ pacienteId: string }> }
) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { pacienteId } = await params;
    const consents = await getConsents(pacienteId);

    return ok(consents);
}

const consentBodySchema = z.object({
    purpose: z.string().min(1),
    action: z.enum(['grant', 'revoke']),
});

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ pacienteId: string }> }
) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { pacienteId } = await params;

    const body = await parseBody(request, consentBodySchema);
    if (isFailResponse(body)) return body;

    if (body.action === 'grant') {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
        const record = await grantConsent(pacienteId, body.purpose, ip);
        return ok(record, 201);
    }

    const record = await revokeConsent(pacienteId, body.purpose);
    if (!record) {
        return fail(E.NOT_FOUND, 'Consentimento ativo não encontrado para esta finalidade', { status: 404 });
    }

    return ok(record);
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
