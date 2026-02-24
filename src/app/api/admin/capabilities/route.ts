import { NextRequest, NextResponse } from 'next/server';
import { buildAdminCapabilities } from '@/lib/admin/capabilities';
import { auth } from '@/auth';
import { resolveUserRole } from '@/lib/auth/roles';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { resolveDatabaseTargetInfo } from '@/lib/db/database-target';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    try {
        const session = await auth();
        const role = resolveUserRole(session?.user?.email);
        const capabilities = await buildAdminCapabilities({ role });
        const schema = await getDbSchemaCapabilities();
        const dbInfo = resolveDatabaseTargetInfo(process.env.DATABASE_URL);
        return NextResponse.json({
            success: true,
            ...capabilities,
            dbSchemaOk: schema.dbSchemaOk,
            missingColumns: schema.missingColumns,
            databaseProvider: dbInfo.provider,
            databaseTarget: dbInfo.target,
        });
    } catch (error) {
        console.error('[API] capabilities GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar capabilities' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
