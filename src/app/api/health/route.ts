import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    checks: {
        database: { status: string; latency?: number };
        fileSystem: { status: string; files?: string[] };
        whatsapp: { status: string; connected?: boolean };
        memory: { used: number; total: number; percentage: number };
    };
}

export async function GET() {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {
        database: { status: 'unknown' },
        fileSystem: { status: 'unknown' },
        whatsapp: { status: 'unknown' },
        memory: { used: 0, total: 0, percentage: 0 },
    };

    // 1. Database Check
    try {
        const dbStart = Date.now();
        const { prisma } = await import('@/lib/prisma');
        await prisma.$queryRaw`SELECT 1`;
        checks.database = {
            status: 'ok',
            latency: Date.now() - dbStart
        };
    } catch (error) {
        checks.database = { status: 'error' };
    }

    // 2. File System Check
    try {
        const requiredFiles = ['.env', 'prisma/dev.db'];
        const existingFiles = requiredFiles.filter(f =>
            fs.existsSync(path.join(process.cwd(), f))
        );
        checks.fileSystem = {
            status: existingFiles.length === requiredFiles.length ? 'ok' : 'warning',
            files: existingFiles
        };
    } catch {
        checks.fileSystem = { status: 'error' };
    }

    // 3. WhatsApp Status Check
    try {
        const sessionFile = path.join(process.cwd(), '.wa-session.json');
        if (fs.existsSync(sessionFile)) {
            const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
            checks.whatsapp = {
                status: session.status === 'CONNECTED' ? 'ok' : 'disconnected',
                connected: session.status === 'CONNECTED'
            };
        } else {
            checks.whatsapp = { status: 'not_configured' };
        }
    } catch {
        checks.whatsapp = { status: 'error' };
    }

    // 4. Memory Check
    const memUsage = process.memoryUsage();
    checks.memory = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Determine overall status
    const hasErrors = Object.values(checks).some(
        c => typeof c === 'object' && 'status' in c && c.status === 'error'
    );
    const hasWarnings = Object.values(checks).some(
        c => typeof c === 'object' && 'status' in c && (c.status === 'warning' || c.status === 'disconnected')
    );

    const health: HealthStatus = {
        status: hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.1.0',
        checks
    };

    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(health, {
        status: statusCode,
        headers: {
            'Cache-Control': 'no-store',
            'X-Response-Time': `${Date.now() - startTime}ms`
        }
    });
}
