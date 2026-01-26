import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FLOWS_FILE = path.join(process.cwd(), '.wa-flows-definitions.json');

interface FlowStep {
    id: string;
    type: 'message' | 'question' | 'media' | 'condition' | 'action' | 'delay' | 'buttons' | 'list';
    content: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    variable?: string;
    options?: { value: string; nextStep: string; }[];
    condition?: { variable: string; operator: string; value: string; trueStep: string; falseStep: string; };
    action?: { type: string; params: any; };
    nextStep?: string;
    delay?: number;
    // Interactive Buttons
    buttons?: { id: string; text: string; nextStep?: string; }[];
    footer?: string;
    // List Message
    listButtonText?: string;
    sections?: { title: string; rows: { id: string; title: string; description?: string; nextStep?: string; }[] }[];
}

interface FlowDefinition {
    id: string;
    name: string;
    description: string;
    trigger: string;
    category: string;
    active: boolean;
    steps: FlowStep[];
    createdAt: string;
    updatedAt: string;
}

const DEFAULT_FLOWS: FlowDefinition[] = [
    {
        id: 'TRIAGEM_CUIDADOR',
        name: 'Triagem de Cuidador',
        description: 'Fluxo de triagem para novos cuidadores',
        trigger: '1|cuidador|quero trabalhar',
        category: 'recrutamento',
        active: true,
        steps: [
            { id: 'welcome', type: 'message', content: 'Olá! Seja bem-vindo ao processo seletivo da Mãos Amigas! 👋', nextStep: 'ask_name' },
            { id: 'ask_name', type: 'question', content: 'Qual é o seu nome completo?', variable: 'nome', nextStep: 'ask_area' },
            {
                id: 'ask_area', type: 'question', content: 'Qual sua área de atuação?\n1️⃣ Cuidador de Idosos\n2️⃣ Técnico de Enfermagem\n3️⃣ Enfermeiro(a)\n4️⃣ Fisioterapeuta', variable: 'area', options: [
                    { value: '1', nextStep: 'ask_experience' }, { value: '2', nextStep: 'ask_experience' }, { value: '3', nextStep: 'ask_experience' }, { value: '4', nextStep: 'ask_experience' }
                ]
            },
            { id: 'ask_experience', type: 'question', content: 'Quantos anos de experiência você tem na área?', variable: 'experiencia', nextStep: 'ask_city' },
            { id: 'ask_city', type: 'question', content: 'Em qual cidade você mora?', variable: 'cidade', nextStep: 'ask_availability' },
            { id: 'ask_availability', type: 'question', content: 'Qual sua disponibilidade de horário?\n1️⃣ Manhã\n2️⃣ Tarde\n3️⃣ Noite\n4️⃣ Integral', variable: 'disponibilidade', nextStep: 'finish' },
            { id: 'finish', type: 'message', content: 'Perfeito, {{nome}}! 🎉\n\nRecebemos seus dados:\n• Área: {{area}}\n• Experiência: {{experiencia}} anos\n• Cidade: {{cidade}}\n\nEm breve nossa equipe de RH entrará em contato. Obrigado!' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'AVALIACAO_PACIENTE',
        name: 'Avaliação de Paciente',
        description: 'Fluxo para solicitação de cuidador',
        trigger: '2|preciso|cuidador|paciente',
        category: 'comercial',
        active: true,
        steps: [
            { id: 'welcome', type: 'message', content: 'Olá! Vamos ajudá-lo a encontrar o cuidador ideal! 💙', nextStep: 'ask_patient' },
            { id: 'ask_patient', type: 'question', content: 'Qual o nome do paciente que precisa de cuidados?', variable: 'paciente', nextStep: 'ask_type' },
            {
                id: 'ask_type', type: 'question', content: 'Qual o tipo de atendimento?\n1️⃣ Home Care (em casa)\n2️⃣ Acompanhamento Hospitalar', variable: 'tipo', options: [
                    { value: '1', nextStep: 'ask_needs' }, { value: '2', nextStep: 'ask_hospital' }
                ]
            },
            { id: 'ask_hospital', type: 'question', content: 'Qual o hospital?', variable: 'hospital', nextStep: 'ask_needs' },
            { id: 'ask_needs', type: 'question', content: 'Quais são as principais necessidades do paciente?', variable: 'necessidades', nextStep: 'ask_shift' },
            { id: 'ask_shift', type: 'question', content: 'Qual turno precisa?\n1️⃣ Diurno (7h-19h)\n2️⃣ Noturno (19h-7h)\n3️⃣ 24 horas', variable: 'turno', nextStep: 'finish' },
            { id: 'finish', type: 'message', content: 'Perfeito! 📋\n\nRecebemos sua solicitação para {{paciente}}.\nTipo: {{tipo}}\nTurno: {{turno}}\n\nNossa equipe fará contato em breve para agendar a avaliação. Obrigado!' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'CONFIRMACAO_PLANTAO',
        name: 'Confirmação de Plantão',
        description: 'Lembrete e confirmação de plantão',
        trigger: 'system:schedule_reminder',
        category: 'operacional',
        active: true,
        steps: [
            { id: 'reminder', type: 'message', content: 'Olá {{nome}}! 📅\n\nLembrando do seu plantão:\n📍 {{local}}\n🕐 {{data}} às {{hora}}\n👤 Paciente: {{paciente}}\n\nConfirme sua presença respondendo OK.', nextStep: 'wait_confirm' },
            {
                id: 'wait_confirm', type: 'question', content: '', variable: 'confirmacao', options: [
                    { value: 'ok|sim|confirmo', nextStep: 'confirmed' }, { value: 'não|nao|cancel', nextStep: 'cancelled' }
                ]
            },
            { id: 'confirmed', type: 'action', content: 'Presença confirmada! ✅ Até lá!', action: { type: 'update_allocation', params: { status: 'CONFIRMADO' } } },
            { id: 'cancelled', type: 'action', content: 'Entendido. Vamos procurar um substituto. 📞', action: { type: 'notify_admin', params: { reason: 'cancellation' } } },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

function loadFlows(): FlowDefinition[] {
    try { if (fs.existsSync(FLOWS_FILE)) return JSON.parse(fs.readFileSync(FLOWS_FILE, 'utf-8')); } catch (_e) { }
    return DEFAULT_FLOWS;
}

function saveFlows(flows: FlowDefinition[]) {
    fs.writeFileSync(FLOWS_FILE, JSON.stringify(flows, null, 2));
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const flows = loadFlows();

        if (id) {
            const flow = flows.find(f => f.id === id);
            return NextResponse.json({ flow });
        }

        const categories = [...new Set(flows.map(f => f.category))];
        const stepTypes = ['message', 'question', 'buttons', 'list', 'media', 'condition', 'action', 'delay'];
        const mediaTypes = ['image', 'video', 'audio', 'document'];
        const actionTypes = ['update_cuidador', 'update_paciente', 'update_allocation', 'notify_admin', 'send_email', 'create_task'];

        return NextResponse.json({ flows, categories, stepTypes, mediaTypes, actionTypes });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, trigger, category, steps } = body;

        const flows = loadFlows();
        const id = name.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now();

        const newFlow: FlowDefinition = {
            id,
            name,
            description: description || '',
            trigger: trigger || '',
            category: category || 'custom',
            active: true,
            steps: steps || [{ id: 'start', type: 'message', content: 'Olá!' }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        flows.push(newFlow);
        saveFlows(flows);

        return NextResponse.json({ success: true, flow: newFlow });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        const flows = loadFlows();
        const idx = flows.findIndex(f => f.id === id);

        if (idx >= 0) {
            flows[idx] = { ...flows[idx], ...updates, updatedAt: new Date().toISOString() };
            saveFlows(flows);
            return NextResponse.json({ success: true, flow: flows[idx] });
        }

        return NextResponse.json({ error: 'Fluxo não encontrado' }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const flows = loadFlows().filter(f => f.id !== id);
        saveFlows(flows);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
    }
}
