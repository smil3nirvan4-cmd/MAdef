import { NextRequest } from 'next/server';
import { buildAdminCapabilities } from '@/lib/admin/capabilities';
import { auth } from '@/auth';
import { resolveUserRole } from '@/lib/auth/roles';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { resolveDatabaseTargetInfo } from '@/lib/db/database-target';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok } from '@/lib/api/response';

async function handleGet(_request: NextRequest) {
    const session = await auth();
    const role = resolveUserRole(session?.user?.email);
    const capabilities = await buildAdminCapabilities({ role });
    const schema = await getDbSchemaCapabilities();
    const dbInfo = resolveDatabaseTargetInfo(process.env.DATABASE_URL);
    return ok({
        ...capabilities,
        dbSchemaOk: schema.dbSchemaOk,
        missingColumns: schema.missingColumns,
        databaseProvider: dbInfo.provider,
        databaseTarget: dbInfo.target,
    });
}

export const GET = withErrorBoundary(handleGet);
