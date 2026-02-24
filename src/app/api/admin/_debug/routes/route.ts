import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

function collectRouteFiles(basePath: string, relative = ''): string[] {
    const absolute = path.join(basePath, relative);
    if (!fs.existsSync(absolute)) return [];

    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const childRelative = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectRouteFiles(basePath, childRelative));
            continue;
        }
        if (entry.isFile() && entry.name === 'route.ts') {
            files.push(childRelative);
        }
    }

    return files;
}

function toApiPath(routeFileRelative: string): string {
    const normalized = routeFileRelative
        .replace(/\\/g, '/')
        .replace(/\/route\.ts$/, '');
    return `/api/${normalized}`;
}

function collectPageFiles(basePath: string, relative = ''): string[] {
    const absolute = path.join(basePath, relative);
    if (!fs.existsSync(absolute)) return [];

    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const childRelative = path.join(relative, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectPageFiles(basePath, childRelative));
            continue;
        }
        if (entry.isFile() && entry.name === 'page.tsx') {
            files.push(childRelative);
        }
    }

    return files;
}

function toPagePath(pageFileRelative: string): string {
    const normalized = pageFileRelative
        .replace(/\\/g, '/')
        .replace(/\/page\.tsx$/, '');
    return normalized ? `/${normalized}` : '/';
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_ANALYTICS');
    if (guard instanceof NextResponse) return guard;

    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { success: false, error: 'Route registry disponivel apenas em desenvolvimento.' },
            { status: 403 }
        );
    }

    const apiBase = path.join(process.cwd(), 'src', 'app', 'api');
    const adminBase = path.join(process.cwd(), 'src', 'app', 'admin');

    const apiRoutes = collectRouteFiles(apiBase).map((file) => ({
        file: path.join('src', 'app', 'api', file).replace(/\\/g, '/'),
        route: toApiPath(file),
    }));

    const adminPages = collectPageFiles(adminBase).map((file) => ({
        file: path.join('src', 'app', 'admin', file).replace(/\\/g, '/'),
        route: toPagePath(path.join('admin', file)),
    }));

    const criticalChecks = [
        '/api/admin/avaliacoes/[id]/send-proposta',
        '/api/admin/avaliacoes/[id]/send-contrato',
        '/api/admin/orcamentos',
        '/api/admin/dashboard/stats',
        '/api/admin/capabilities',
        '/admin/orcamentos/novo',
        '/admin/whatsapp/queue',
    ];

    const routeSet = new Set([...apiRoutes.map((r) => r.route), ...adminPages.map((p) => p.route)]);

    return NextResponse.json({
        success: true,
        environment: process.env.NODE_ENV,
        generatedAt: new Date().toISOString(),
        apiRoutes,
        adminPages,
        criticalChecks: criticalChecks.map((route) => ({
            route,
            exists: routeSet.has(route),
        })),
    });
}

export const GET = withErrorBoundary(handleGet);
