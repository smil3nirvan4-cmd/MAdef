import { NextResponse } from 'next/server';
import { metrics } from '@/lib/observability/metrics';

export async function GET() {
    return NextResponse.json(metrics.snapshot(), {
        headers: { 'Cache-Control': 'no-store' },
    });
}
