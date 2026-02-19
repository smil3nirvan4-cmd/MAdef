import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState, acquireSlotLock } from '../state-manager';
import { sendMessage } from '../client';
import { prisma } from '@/lib/prisma';

export async function handleEscolhaSlot(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const { equipeId, cuidadorId, pacienteId, pacienteNome } = state.data;

    // Parse: "ESCOLHER C1" ou "C1"
    const match = body.toUpperCase().match(/C([1-8])/);

    if (!match) {
        await sendMessage(from, '⚠️ Formato inválido. Digite: *ESCOLHER C1* (ou C2, C3... C8)');
        return;
    }

    const slotId = `C${match[1]}`;
    const fullSlotId = `slot:${equipeId}:${slotId}`;
    // const pacienteId = state.data.pacienteId; // Already destructured above

    // 1. Tentar adquirir lock (race condition safety)
    const acquired = await acquireSlotLock(fullSlotId, cuidadorId);

    if (!acquired) {
        await sendMessage(from, `
❌ Ops! O slot *${slotId}* já está sendo selecionado ou já foi ocupado.

⚡ *Rápido! Escolha outro slot que ainda esteja disponível!*
        `.trim());
        return;
    }

    try {
        // 2. Verificar se já existe alocação no banco para este paciente e slot (Double Check)
        const existing = await prisma.alocacao.findFirst({
            where: {
                slotId,
                pacienteId,
                status: 'CONFIRMADO'
            }
        });

        if (existing) {
            await sendMessage(from, `❌ O slot *${slotId}* para este paciente já foi preenchido por outro colega.`);
            return;
        }

        // 3. Persistir Alocação
        await prisma.alocacao.create({
            data: {
                cuidadorId,
                pacienteId,
                slotId,
                turno: parseInt(match[1]) <= 4 ? 'MANHA' : 'NOITE',
                diaSemana: (parseInt(match[1]) - 1) % 4,
                dataInicio: new Date(),
                status: 'CONFIRMADO',
                confirmadoT24: new Date()
            }
        });

        // 4. Confirmar para o cuidador
        await sendMessage(from, `
✅ *PARABÉNS! VAGA GARANTIDA!*

Você escolheu o slot *${slotId}* para o paciente *${pacienteNome || '[Paciente]'}*.

📋 *Próximos Passos:*
- Enviaremos o endereço exato e o plano de cuidados (briefing) em breve.
- O contrato digital será enviado para sua conferência.

Seja bem-vindo(a) à equipe! 🤝
        `.trim());

        // 5. Resetar estado para IDLE
        await setUserState(from, {
            currentFlow: 'IDLE',
            currentStep: '',
            data: {},
        });

    } catch (error) {
        console.error('Erro ao processar escolha de slot:', error);
        await sendMessage(from, '❌ Desculpe, ocorreu um erro ao processar sua escolha. Tente novamente.');
    }
}

