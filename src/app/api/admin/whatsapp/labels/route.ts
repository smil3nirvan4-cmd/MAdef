import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LABELS_FILE = path.join(process.cwd(), '.wa-labels.json');

const DEFAULT_LABELS = [
    { id: '1', name: 'VIP', color: '#FFD700', description: 'Clientes prioritários' },
    { id: '2', name: 'Novo', color: '#4CAF50', description: 'Novos contatos' },
    { id: '3', name: 'Aguardando', color: '#FF9800', description: 'Aguardando resposta' },
    { id: '4', name: 'Problema', color: '#F44336', description: 'Com problemas' },
    { id: '5', name: 'Urgente', color: '#9C27B0', description: 'Atendimento urgente' },
    { id: '6', name: 'Fechado', color: '#607D8B', description: 'Atendimento concluído' },
];

function loadLabels() {
    try { if (fs.existsSync(LABELS_FILE)) return JSON.parse(fs.readFileSync(LABELS_FILE, 'utf-8')); } catch (_e) { }
    return DEFAULT_LABELS;
}

function saveLabels(labels: any[]) {
    fs.writeFileSync(LABELS_FILE, JSON.stringify(labels, null, 2));
}

export async function GET() {
    try {
        return NextResponse.json({ labels: loadLabels() });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, color, description } = body;
        const labels = loadLabels();
        labels.push({ id: Date.now().toString(), name, color: color || '#3B82F6', description: description || '' });
        saveLabels(labels);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const labels = loadLabels().filter((l: any) => l.id !== id);
        saveLabels(labels);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
