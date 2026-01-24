import type { Slot, Equipe } from './slots';

interface Cuidador {
    id: string;
    nome: string;
    telefone: string;
    disponibilidade: {
        turno: 'MANHA' | 'TARDE' | 'NOITE';
        diasSemana: number[];
    }[];
    score?: number; // Baseado em avaliações anteriores
}

interface AlocacaoResult {
    slotId: string;
    cuidadorId: string;
    status: 'ALOCADO' | 'PENDENTE_FEEDBACK' | 'REJEITADO';
    dataAlocacao: Date;
}

export async function executarAlocacaoImpositiva(
    equipe: Equipe,
    cuidadoresDisponiveis: Cuidador[]
): Promise<AlocacaoResult[]> {
    const resultados: AlocacaoResult[] = [];

    // Ordenar cuidadores por score (melhores primeiro)
    const cuidadoresOrdenados = [...cuidadoresDisponiveis]
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Alocar cada slot
    for (const slot of equipe.slots) {
        // Encontrar cuidador compatível
        const cuidadorCompativel = cuidadoresOrdenados.find(c => {
            // Verificar se já não foi alocado
            if (resultados.some(r => r.cuidadorId === c.id)) return false;

            // Verificar disponibilidade
            return c.disponibilidade.some(d =>
                d.turno === slot.turno &&
                d.diasSemana.includes(slot.diaSemana)
            );
        });

        if (cuidadorCompativel) {
            resultados.push({
                slotId: slot.id,
                cuidadorId: cuidadorCompativel.id,
                status: 'PENDENTE_FEEDBACK',
                dataAlocacao: new Date(),
            });

            // Atualizar slot
            slot.cuidadorId = cuidadorCompativel.id;
            slot.status = 'RESERVADO';
        }
    }

    return resultados;
}

// Template de mensagem para envio
export function gerarMensagemAlocacao(
    cuidadorNome: string,
    slotId: string,
    turno: string,
    pacienteInfo: { nome: string; endereco: string }
): string {
    return `🏥 *Mãos Amigas - Plantão Alocado*

Olá ${cuidadorNome}!

Você foi alocado(a) para o seguinte plantão:

📍 *Slot:* ${slotId}
⏰ *Turno:* ${turno}
👤 *Paciente:* ${pacienteInfo.nome}
📌 *Local:* ${pacienteInfo.endereco}

Por favor, confirme sua disponibilidade:
✅ Responda *ACEITO* para confirmar
❌ Responda *RECUSO* + motivo para recusar

_Você tem 2 horas para responder._`;
}
