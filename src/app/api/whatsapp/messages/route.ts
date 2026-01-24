import { NextResponse } from 'next/server';
import { getAllMessages } from '@/lib/database';

export async function GET() {
    try {
        const messages = await getAllMessages(20);
        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
