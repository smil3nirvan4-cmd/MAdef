import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleAguardando(message: WhatsAppMessage, state: UserState) {
    const { from } = message;

    // Se for AGUARDANDO_RH (Cuidador)
    if (state.currentFlow === 'AGUARDANDO_RH') {
        await sendMessage(from, `
📄 *Cadastro em Análise*

Olá! Recebemos seu cadastro e ele está com nossa equipe de RH.
Ainda não precisamos de mais informações.

Assim que tivermos uma posição sobre sua entrevista, entraremos em contato por aqui ou telefone.

Se precisar de algo urgente, digite *AJUDA*.
        `.trim());
        return;
    }

    // Se for AGUARDANDO_AVALIACAO (Paciente)
    if (state.currentFlow === 'AGUARDANDO_AVALIACAO') {
        await sendMessage(from, `
🏥 *Solicitação em Andamento*

Olá! Seu pedido de cuidado já está registrado.
Nossa equipe de avaliação está verificando a disponibilidade dos melhores profissionais para o seu caso.

Entraremos em contato em breve para apresentar o orçamento.

Se for uma emergência, ligue 192.
Para falar com atendente, digite *AJUDA*.
        `.trim());
        return;
    }
}
