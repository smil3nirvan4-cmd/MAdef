import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AUTOREPLIES_FILE = path.join(process.cwd(), '.wa-autoreplies.json');

const DEFAULT_AUTOREPLIES = [
    { id: '1', name: 'Saudação', trigger: 'oi|olá|ola|bom dia|boa tarde|boa noite', triggerType: 'regex', response: 'Olá! Bem-vindo à Mãos Amigas. Como posso ajudar?\n\n1️⃣ Sou CUIDADOR\n2️⃣ Preciso de um cuidador\n3️⃣ Falar com atendente', active: true, priority: 1 },
    { id: '2', name: 'Menu', trigger: 'menu|opções|ajuda', triggerType: 'regex', response: 'Digite:\n1️⃣ Sou CUIDADOR\n2️⃣ Preciso de um cuidador\n3️⃣ Falar com atendente', active: true, priority: 2 },
    { id: '3', name: 'Horário', trigger: 'horário|horario|funcionamento', triggerType: 'contains', response: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.', active: true, priority: 3 },
    { id: '4', name: 'Endereço', trigger: 'endereço|endereco|localização|localizacao|onde fica', triggerType: 'contains', response: 'Estamos localizados na Rua Exemplo, 123 - Centro. Agende sua visita!', active: true, priority: 4 },
    { id: '5', name: 'Preço', trigger: 'preço|preco|valor|quanto custa|tabela', triggerType: 'contains', response: 'Para informações sobre valores, por favor informe o tipo de atendimento que precisa e faremos uma avaliação personalizada.', active: true, priority: 5 },
];

function loadAutoReplies() {
    try { if (fs.existsSync(AUTOREPLIES_FILE)) return JSON.parse(fs.readFileSync(AUTOREPLIES_FILE, 'utf-8')); } catch (_e) { }
    return DEFAULT_AUTOREPLIES;
}

function saveAutoReplies(rules: any[]) {
    fs.writeFileSync(AUTOREPLIES_FILE, JSON.stringify(rules, null, 2));
}

export async function GET() {
    try {
        const rules = loadAutoReplies();
        const triggerTypes = ['exact', 'contains', 'startsWith', 'endsWith', 'regex'];
        return NextResponse.json({ rules, triggerTypes });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, trigger, triggerType, response, priority } = body;
        const rules = loadAutoReplies();
        rules.push({ id: Date.now().toString(), name, trigger, triggerType: triggerType || 'contains', response, active: true, priority: priority || rules.length + 1, createdAt: new Date().toISOString() });
        saveAutoReplies(rules);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        const rules = loadAutoReplies();
        const idx = rules.findIndex((r: any) => r.id === id);
        if (idx >= 0) { rules[idx] = { ...rules[idx], ...updates }; saveAutoReplies(rules); }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const rules = loadAutoReplies().filter((r: any) => r.id !== id);
        saveAutoReplies(rules);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
