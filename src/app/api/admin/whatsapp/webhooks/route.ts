import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const WEBHOOKS_FILE = path.join(process.cwd(), '.wa-webhooks.json');

const DEFAULT_WEBHOOKS = [
    { id: '1', name: 'CRM Callback', url: '', events: ['message_received', 'message_sent'], active: false, secret: '' },
    { id: '2', name: 'Analytics', url: '', events: ['message_received'], active: false, secret: '' },
];

function loadWebhooks() {
    try { if (fs.existsSync(WEBHOOKS_FILE)) return JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf-8')); } catch (_e) { }
    return DEFAULT_WEBHOOKS;
}

function saveWebhooks(webhooks: any[]) {
    fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
}

export async function GET() {
    try {
        const webhooks = loadWebhooks();
        const events = ['message_received', 'message_sent', 'flow_started', 'flow_completed', 'contact_created', 'status_changed'];
        return NextResponse.json({ webhooks, events });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, url, events, secret } = body;
        const webhooks = loadWebhooks();
        webhooks.push({ id: Date.now().toString(), name, url, events: events || [], active: true, secret: secret || '', createdAt: new Date().toISOString() });
        saveWebhooks(webhooks);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const webhooks = loadWebhooks();
        const idx = webhooks.findIndex((w: any) => w.id === id);
        if (idx >= 0) { webhooks[idx] = { ...webhooks[idx], ...updates }; saveWebhooks(webhooks); }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const webhooks = loadWebhooks().filter((w: any) => w.id !== id);
        saveWebhooks(webhooks);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
