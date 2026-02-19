import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nome, hospital, quarto, nivel, phone } = body;

        if (!nome || !hospital || !nivel) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
        }

        // 1. Criar ou atualizar paciente
        // Se tiver phone, usamos. Se não, geramos um "hash" temporário ou pedimos depois.
        // Para Hospital Flow, geralmente o atendente preenche.
        const telefone = phone || `HOSP-${Date.now()}`;

        const paciente = await DB.paciente.upsert(telefone, {
            nome,
            tipo: 'HOSPITAL',
            hospital,
            quarto,
            status: 'PRIORIDADE_ALTA',
            prioridade: 'EMERGENCIA'
        });

        // 2. Criar avaliação simplificada
        const avaliacao = await DB.avaliacao.create({
            pacienteId: paciente.id,
            nivelSugerido: nivel,
            cargaSugerida: '12x36', // Padrão hospitalar comum
            status: 'VALIDADA' // Já nasce validada para agilizar
        });

        // 3. Notificar (Mocked por enquanto - dispararia oferta para cuidadores)
        console.log(`🚀 AGIL FLOW: Paciente ${nome} criado. Nível: ${nivel}. Acionando rede...`);

        return NextResponse.json({ success: true, pacienteId: paciente.id, avaliacaoId: avaliacao.id });

    } catch (error) {
        console.error('Erro no fluxo ágil hospitalar:', error);
        return NextResponse.json({ error: 'Erro interno ao processar plantão' }, { status: 500 });
    }
}
