import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';
import { ok } from '@/lib/api/response';
import { metrics } from '@/lib/observability/metrics';
import { getRedis } from '@/lib/redis/client';

interface Alert {
    level: 'warning' | 'critical';
    message: string;
}

async function handleGet(): Promise<NextResponse> {
    const authResult = await guardCapability('MANAGE_SETTINGS');
    if (authResult instanceof NextResponse) return authResult;

    const snapshot = metrics.snapshot();
    const mem = process.memoryUsage();
    const memUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const memPercentage = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    // Database check
    let dbStatus = 'unknown';
    let dbLatencyMs = 0;
    try {
        const dbStart = Date.now();
        const { prisma } = await import('@/lib/prisma');
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStart;
        dbStatus = 'ok';
    } catch {
        dbStatus = 'error';
    }

    // Redis check
    let redisStatus = 'unknown';
    let redisLatencyMs = 0;
    try {
        const redisStart = Date.now();
        const redis = await getRedis();
        if (redis) {
            await redis.ping();
            redisLatencyMs = Date.now() - redisStart;
            redisStatus = 'ok';
        } else {
            redisStatus = 'not_configured';
        }
    } catch {
        redisStatus = 'error';
    }

    // Metrics calculations
    const httpTotal = snapshot.counters['http_requests_total']?.value ?? 0;
    const httpErrors = snapshot.counters['http_errors_total']?.value ?? 0;
    const errorRate = httpTotal > 0 ? (httpErrors / httpTotal) * 100 : 0;
    const httpDuration = snapshot.histograms['http_request_duration_ms'];
    const avgLatency = httpDuration ? httpDuration.avg : 0;

    const cacheHits = snapshot.counters['cache_hit']?.value ?? 0;
    const cacheMisses = snapshot.counters['cache_miss']?.value ?? 0;
    const cacheTotal = cacheHits + cacheMisses;
    const cacheHitRate = cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) : 0;

    // Auto-generated alerts
    const alerts: Alert[] = [];

    if (errorRate > 5) {
        alerts.push({ level: 'warning', message: `Error rate is ${errorRate.toFixed(1)}% (threshold: 5%)` });
    }
    if (avgLatency > 2000) {
        alerts.push({ level: 'warning', message: `Average latency is ${avgLatency}ms (threshold: 2000ms)` });
    }
    if (memPercentage > 80) {
        alerts.push({ level: 'critical', message: `Heap usage at ${memPercentage}% (threshold: 80%)` });
    }
    if (dbStatus === 'error') {
        alerts.push({ level: 'critical', message: 'Database is unreachable' });
    }
    if (redisStatus === 'error') {
        alerts.push({ level: 'warning', message: 'Redis is unreachable' });
    }

    // Overall status
    const hasCritical = alerts.some((a) => a.level === 'critical');
    const hasWarning = alerts.some((a) => a.level === 'warning');
    const overallStatus = hasCritical ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    const version = process.env.npm_package_version || '0.1.0';

    return ok({
        system: {
            status: overallStatus,
            uptime: Math.round(process.uptime()),
            version,
            nodeVersion: process.version,
            memoryUsage: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: memUsedMB,
                heapTotal: memTotalMB,
            },
        },
        services: {
            database: { status: dbStatus, latencyMs: dbLatencyMs },
            redis: { status: redisStatus, latencyMs: redisLatencyMs },
            whatsapp: { status: 'check_circuit_breaker' },
        },
        metrics: {
            requests: {
                total: httpTotal,
                errorRate: Math.round(errorRate * 100) / 100,
            },
            cache: { hitRate: cacheHitRate },
            avgLatencyMs: avgLatency,
        },
        alerts,
    });
}

export const GET = withErrorBoundary(handleGet);
