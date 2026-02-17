import { NextResponse } from 'next/server';
import { buildAdminCapabilities } from '@/lib/admin/capabilities';
import { auth } from '@/auth';
import { resolveUserRole } from '@/lib/auth/roles';

export async function GET() {
    try {
        const session = await auth();
        const role = resolveUserRole(session?.user?.email);
        const capabilities = await buildAdminCapabilities({ role });
        return NextResponse.json({ success: true, ...capabilities });
    } catch (error) {
        console.error('[API] capabilities GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar capabilities' }, { status: 500 });
    }
}
