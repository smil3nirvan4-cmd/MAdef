import { NextRequest } from 'next/server';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import {
    exportSubjectData,
    anonymizeSubjectData,
    getConsents,
    recordConsent,
    revokeConsent,
    type SubjectType,
} from '@/lib/lgpd/lgpd.service';

const VALID_SUBJECT_TYPES: SubjectType[] = ['PACIENTE', 'CUIDADOR'];

function validateSubject(body: Record<string, unknown>):
    | { ok: true; subjectType: SubjectType; subjectId: string }
    | { ok: false; error: string } {
    const subjectType = String(body.subjectType || '').toUpperCase() as SubjectType;
    const subjectId = String(body.subjectId || '');
    if (!VALID_SUBJECT_TYPES.includes(subjectType)) {
        return { ok: false, error: 'subjectType must be PACIENTE or CUIDADOR' };
    }
    if (!subjectId) {
        return { ok: false, error: 'subjectId is required' };
    }
    return { ok: true, subjectType, subjectId };
}

/**
 * GET /api/admin/lgpd?subjectType=PACIENTE&subjectId=xxx
 * - action=export → export all subject data (LGPD portability)
 * - action=consents → list consent records
 */
export const GET = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof Response) return guard;

    const { searchParams } = request.nextUrl;
    const subjectType = (searchParams.get('subjectType') || '').toUpperCase() as SubjectType;
    const subjectId = searchParams.get('subjectId') || '';
    const action = searchParams.get('action') || 'export';

    if (!VALID_SUBJECT_TYPES.includes(subjectType) || !subjectId) {
        return fail(E.VALIDATION_ERROR, 'subjectType and subjectId are required');
    }

    if (action === 'consents') {
        const consents = await getConsents(subjectType, subjectId);
        return ok(consents);
    }

    const data = await exportSubjectData(subjectType, subjectId);
    return ok(data);
});

/**
 * POST /api/admin/lgpd
 * Body: { action: "consent" | "revoke" | "anonymize", subjectType, subjectId, ... }
 */
export const POST = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof Response) return guard;

    const body = await request.json();
    const action = String(body.action || '');

    const validated = validateSubject(body);
    if (!validated.ok) {
        return fail(E.VALIDATION_ERROR, validated.error);
    }
    const { subjectType, subjectId } = validated;

    switch (action) {
        case 'consent': {
            const purpose = String(body.purpose || 'DATA_PROCESSING');
            await recordConsent({
                subjectType,
                subjectId,
                purpose,
                granted: body.granted !== false,
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            });
            return ok({ recorded: true });
        }

        case 'revoke': {
            const purpose = String(body.purpose || 'DATA_PROCESSING');
            await revokeConsent(subjectType, subjectId, purpose);
            return ok({ revoked: true });
        }

        case 'anonymize': {
            await anonymizeSubjectData(subjectType, subjectId, guard.userId, guard.userId);
            return ok({ anonymized: true });
        }

        default:
            return fail(E.VALIDATION_ERROR, 'action must be consent, revoke, or anonymize');
    }
});
