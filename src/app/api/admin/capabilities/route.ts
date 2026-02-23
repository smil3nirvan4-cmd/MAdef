import { NextResponse } from 'next/server';
import { buildAdminCapabilities } from '@/lib/admin/capabilities';
import { auth } from '@/auth';
import { resolveUserRole } from '@/lib/auth/roles';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { resolveDatabaseTargetInfo } from '@/lib/db/database-target';
import logger from '@/lib/observability/logger';

export async function GET() {
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
        await logger.error('capabilities_fetch_error', 'Erro ao carregar capabilities', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao carregar capabilities' }, { status: 500 });
    }
}
