import { NextRequest, NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';
import { ok, fail, E } from '@/lib/api/response';
import {
    recordConsent,
    getConsentHistory,
    getActiveConsents,
    exportPersonalData,
    anonymizePersonalData,
    type ConsentType,
} from '@/lib/lgpd/service';

const VALID_CONSENT_TYPES: ConsentType[] = ['TERMS', 'MARKETING', 'DATA_PROCESSING', 'PROFILING'];
const VALID_ACTIONS = ['consent', 'history', 'export', 'anonymize'] as const;

async function handleGet(request: NextRequest) {
    const authResult = await guardCapability('MANAGE_LGPD');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = request.nextUrl;
    const phone = searchParams.get('phone');
    const action = searchParams.get('action') || 'history';

    if (!phone) {
        return fail(E.MISSING_FIELD, 'phone is required', { field: 'phone' });
    }

    if (action === 'export') {
        const data = await exportPersonalData(phone);
        return ok(data);
    }

    if (action === 'consents') {
        const data = await getActiveConsents(phone);
        return ok(data);
    }

    const data = await getConsentHistory(phone);
    return ok(data);
}

async function handlePost(request: NextRequest) {
    const authResult = await guardCapability('MANAGE_LGPD');
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { action } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
        return fail(E.VALIDATION_ERROR, `action must be one of: ${VALID_ACTIONS.join(', ')}`);
    }

    if (action === 'consent') {
        const { phone, tipo, consentido, versaoTermos } = body;
        if (!phone) return fail(E.MISSING_FIELD, 'phone is required', { field: 'phone' });
        if (!tipo || !VALID_CONSENT_TYPES.includes(tipo)) {
            return fail(E.VALIDATION_ERROR, `tipo must be one of: ${VALID_CONSENT_TYPES.join(', ')}`);
        }
        if (typeof consentido !== 'boolean') {
            return fail(E.VALIDATION_ERROR, 'consentido must be a boolean');
        }

        const record = await recordConsent({
            subjectPhone: phone,
            tipo,
            consentido,
            versaoTermos,
            ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
            userAgent: request.headers.get('user-agent') ?? undefined,
        });
        return ok(record, 201);
    }

    if (action === 'export') {
        const { phone } = body;
        if (!phone) return fail(E.MISSING_FIELD, 'phone is required', { field: 'phone' });
        const data = await exportPersonalData(phone);
        return ok(data);
    }

    if (action === 'anonymize') {
        const { phone } = body;
        if (!phone) return fail(E.MISSING_FIELD, 'phone is required', { field: 'phone' });
        const result = await anonymizePersonalData(phone);
        return ok(result);
    }

    return fail(E.VALIDATION_ERROR, 'Unknown action');
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
