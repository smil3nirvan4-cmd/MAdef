import type { Slot, Equipe } from './slots';

interface SlotDisponivel extends Slot {
    descricao: string;
}

// Estado em memória dos slots (em produção usar Redis)
const slotsState = new Map<string, SlotDisponivel>();

export function inicializarSlotsParaEscolha(equipe: Equipe): SlotDisponivel[] {
    const slotsDisponiveis: SlotDisponivel[] = [];

    for (const slot of equipe.slots) {
        const slotDisponivel: SlotDisponivel = {
            ...slot,
            descricao: `${slot.id} - ${slot.turno} (${getDiaSemanaLabel(slot.diaSemana)})`,
        };

        slotsDisponiveis.push(slotDisponivel);
        slotsState.set(`${equipe.id}:${slot.id}`, slotDisponivel);
    }

    return slotsDisponiveis;
}

function getDiaSemanaLabel(dia: number): string {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[dia];
}

export interface EscolhaResult {
    success: boolean;
    message: string;
    slotId?: string;
    slotsRestantes?: SlotDisponivel[];
}

export function processarEscolha(
    equipeId: string,
    slotId: string,
    cuidadorId: string
): EscolhaResult {
    const key = `${equipeId}:${slotId}`;
    const slot = slotsState.get(key);

    if (!slot) {
        return {
            success: false,
            message: `Slot ${slotId} não encontrado.`,
        };
    }

    if (slot.status !== 'DISPONIVEL') {
        // Buscar slots ainda disponíveis
        const restantes = Array.from(slotsState.values())
            .filter(s => s.equipeId === equipeId && s.status === 'DISPONIVEL');

        return {
            success: false,
            message: `Slot ${slotId} já foi escolhido por outro cuidador.`,
            slotsRestantes: restantes,
        };
    }

    // Alocar slot
    slot.cuidadorId = cuidadorId;
    slot.status = 'CONFIRMADO';
    slotsState.set(key, slot);

    // Buscar slots restantes
    const restantes = Array.from(slotsState.values())
        .filter(s => s.equipeId === equipeId && s.status === 'DISPONIVEL');

    return {
        success: true,
        message: `✅ Parabéns! Você garantiu o slot ${slotId}!`,
        slotId,
        slotsRestantes: restantes,
    };
}

// Template de mensagem para escolha
export function gerarMensagemEscolha(
    cuidadorNome: string,
    slots: SlotDisponivel[]
): string {
    const slotsTexto = slots
        .filter(s => s.status === 'DISPONIVEL')
        .map(s => `🔹 *${s.id}* - ${s.turno} (${getDiaSemanaLabel(s.diaSemana)})`)
        .join('\n');

    return `🏥 *Mãos Amigas - Escolha seu Plantão*

Olá ${cuidadorNome}!

Você foi aprovado(a) para a equipe. Escolha uma das vagas disponíveis:

${slotsTexto}

Para escolher, responda: *ESCOLHER C1* (ou C2, C3, etc.)

⚡ _Primeiro a escolher garante a vaga!_`;
}
