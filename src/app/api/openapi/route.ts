import { NextResponse } from 'next/server';
import { getOpenAPISpec } from '@/lib/openapi/spec';

export async function GET() {
    return NextResponse.json(getOpenAPISpec(), {
        headers: { 'Cache-Control': 'public, max-age=3600' },
    });
}
