import { NextResponse } from 'next/server';
import { metrics } from '@/lib/observability/metrics';

export async function GET() {
    const snapshot = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        counters: metrics.getCounters(),
        histograms: metrics.getHistograms(),
        memory: {
            heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
    };

    return NextResponse.json(snapshot, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
