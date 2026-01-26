import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const TEMPLATES_FILE = path.join(process.cwd(), '.wa-templates.json');

const DEFAULT_TEMPLATES = [
    { id: '1', name: 'Boas-vindas Cuidador', category: 'onboarding', content: 'Olá {{nome}}! Bem-vindo à Mãos Amigas. Estamos felizes em tê-lo conosco. Para continuar seu cadastro, responda CONTINUAR.' },
    { id: '2', name: 'Confirmação Plantão', category: 'escala', content: 'Olá {{nome}}! Você tem um plantão agendado para {{data}} às {{hora}} no {{local}}. Confirme sua presença respondendo OK.' },
    { id: '3', name: 'Lembrete T-24h', category: 'escala', content: 'Lembrete: Seu plantão é amanhã, {{data}} às {{hora}}. Por favor, confirme respondendo SIM.' },
    { id: '4', name: 'Lembrete T-2h', category: 'escala', content: 'Atenção: Seu plantão começa em 2 horas. Confirme que está a caminho respondendo OK.' },
    { id: '5', name: 'Proposta Comercial', category: 'comercial', content: 'Olá {{nome}}! Preparamos uma proposta especial para você. Valor: R$ {{valor}}/mês. Para mais detalhes, responda PROPOSTA.' },
    { id: '6', name: 'Contrato', category: 'comercial', content: 'Olá {{nome}}! Seu contrato está pronto para assinatura. Acesse o link: {{link}}' },
    { id: '7', name: 'Avaliação', category: 'feedback', content: 'Olá {{nome}}! Como foi sua experiência conosco? Responda de 1 a 5, sendo 5 excelente.' },
    { id: '8', name: 'Cobrança', category: 'financeiro', content: 'Olá {{nome}}! Identificamos uma pendência de R$ {{valor}}. Para regularizar, responda PAGAR ou entre em contato.' },
];

function loadTemplates() {
    try {
        if (fs.existsSync(TEMPLATES_FILE)) {
            return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf-8'));
        }
    } catch (_e) { }
    return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: any[]) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}

export async function GET() {
    try {
        const templates = loadTemplates();
        const categories = [...new Set(templates.map((t: any) => t.category))];
        return NextResponse.json({ templates, categories });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, category, content } = body;

        const templates = loadTemplates();
        const newTemplate = {
            id: Date.now().toString(),
            name,
            category,
            content,
            createdAt: new Date().toISOString(),
        };
        templates.push(newTemplate);
        saveTemplates(templates);

        return NextResponse.json({ success: true, template: newTemplate });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const templates = loadTemplates();
        const filtered = templates.filter((t: any) => t.id !== id);
        saveTemplates(filtered);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
