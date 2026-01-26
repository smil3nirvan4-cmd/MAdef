import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const QUICK_REPLIES_FILE = path.join(process.cwd(), '.wa-quick-replies.json');

const DEFAULT_REPLIES = [
    { id: '1', shortcut: '/oi', content: 'Olá! Como posso ajudar você hoje?' },
    { id: '2', shortcut: '/menu', content: 'Digite:\n1️⃣ Sou CUIDADOR\n2️⃣ Preciso de um cuidador\n3️⃣ Falar com atendente' },
    { id: '3', shortcut: '/aguarde', content: 'Por favor, aguarde um momento. Em breve retornaremos.' },
    { id: '4', shortcut: '/obrigado', content: 'Obrigado pelo contato! Se precisar de algo mais, estamos à disposição. 😊' },
    { id: '5', shortcut: '/horario', content: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.' },
    { id: '6', shortcut: '/endereco', content: 'Nosso endereço é: Rua Exemplo, 123 - Centro' },
    { id: '7', shortcut: '/docs', content: 'Para o seu cadastro, precisamos dos seguintes documentos:\n📄 RG/CPF\n📄 Comprovante de residência\n📄 Certificados' },
    { id: '8', shortcut: '/pix', content: 'Chave PIX: contato@maosamigas.com.br' },
];

function loadReplies() {
    try {
        if (fs.existsSync(QUICK_REPLIES_FILE)) {
            return JSON.parse(fs.readFileSync(QUICK_REPLIES_FILE, 'utf-8'));
        }
    } catch (_e) { }
    return DEFAULT_REPLIES;
}

function saveReplies(replies: any[]) {
    fs.writeFileSync(QUICK_REPLIES_FILE, JSON.stringify(replies, null, 2));
}

export async function GET() {
    try {
        const replies = loadReplies();
        return NextResponse.json({ replies });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { shortcut, content } = body;

        if (!shortcut || !content) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        const replies = loadReplies();
        const newReply = { id: Date.now().toString(), shortcut, content };
        replies.push(newReply);
        saveReplies(replies);

        return NextResponse.json({ success: true, reply: newReply });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const replies = loadReplies();
        const filtered = replies.filter((r: any) => r.id !== id);
        saveReplies(filtered);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
