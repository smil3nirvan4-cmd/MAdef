import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BLACKLIST_FILE = path.join(process.cwd(), '.wa-blacklist.json');

function loadBlacklist() {
    try { if (fs.existsSync(BLACKLIST_FILE)) return JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf-8')); } catch (_e) { }
    return [];
}

function saveBlacklist(list: any[]) {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(list, null, 2));
}

export async function GET() {
    try {
        return NextResponse.json({ blacklist: loadBlacklist() });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, reason } = body;
        const list = loadBlacklist();
        if (!list.find((b: any) => b.phone === phone)) {
            list.push({ id: Date.now().toString(), phone, reason: reason || '', createdAt: new Date().toISOString() });
            saveBlacklist(list);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');
        const list = loadBlacklist().filter((b: any) => b.phone !== phone);
        saveBlacklist(list);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
