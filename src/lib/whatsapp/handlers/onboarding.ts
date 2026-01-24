import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleOnboarding(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;

    // Step 1: Welcome
    if (state.currentStep === 'WELCOME') {
        await sendMessage(from, `
🤝 *Bem-vindo à Mãos Amigas!*

Você é:
1️⃣ Paciente/Familiar buscando cuidador
2️⃣ Profissional querendo se cadastrar
3️⃣ Tenho dúvidas

Digite o número da opção:
    `.trim());

        await setUserState(from, {
            currentStep: 'AWAITING_TYPE',
        });
        return;
    }

    // Step 2: Definir tipo de usuário
    if (state.currentStep === 'AWAITING_TYPE') {
        const option = body.trim();

        if (option === '1') {
            // Paciente/Familiar
            await sendMessage(from, `
🚨 *Triagem de Prioridade* 🚨

Para melhor te atender, preciso saber:
É uma *Emergência Médica* imediata ou um *Cuidado Planejado*?

1️⃣ EMERGÊNCIA (Preciso agora!)
2️⃣ PLANEJADO (Tenho tempo para organizar)

Digite o número:
      `.trim());

            await setUserState(from, {
                currentFlow: 'CADASTRO_PACIENTE',
                currentStep: 'AWAITING_URGENCY_TYPE',
                data: { tipo: 'PACIENTE' },
            });
            return;
        }

        if (option === '2') {
            await sendMessage(from, `
Que legal! 🎉

Vamos começar seu cadastro.
Qual sua área de atuação?

1️⃣ Cuidador(a) de Idosos
2️⃣ Técnico(a) de Enfermagem
3️⃣ Auxiliar de Enfermagem
4️⃣ Enfermeiro(a)
5️⃣ Outro

Digite o número:
      `.trim());

            await setUserState(from, {
                currentFlow: 'CADASTRO_CUIDADOR',
                currentStep: 'AWAITING_AREA',
                data: { tipo: 'PROFISSIONAL' },
            });
            return;
        }

        // Opção inválida
        await sendMessage(from, `
Opção inválida. Digite 1, 2 ou 3.
    `.trim());
        return;
    }

    // Step 3: Triagem de Urgência (Paciente)
    if (state.currentStep === 'AWAITING_URGENCY_TYPE') {
        const option = body.trim();

        if (option === '1') {
            // EMERGÊNCIA
            await sendMessage(from, `
🛑 *ATENÇÃO: EMERGÊNCIA MÉDICA* 🛑

Nós somos um serviço de cuidados domiciliares e NÃO atendemos emergências com risco de vida imediato.

📞 *LIGUE AGORA PARA O 192 (SAMU)*

Nossa equipe administrativa foi notificada do seu contato e tentará falar com você em breve, mas *não aguarde* para buscar socorro especializado.
            `.trim());

            // TODO: Notificar Admin via Telegram/Slack/Email com urgência máxima

            // Resetar ou pausar estado
            await setUserState(from, {
                currentFlow: 'EMERGENCIA_ACIONADA',
                currentStep: 'WAITING_ADMIN',
            });
            return;
        }

        if (option === '2') {
            // PLANEJADO - Segue fluxo normal
            await sendMessage(from, `
Entendi. Vamos planejar o melhor cuidado com calma.

Como prefere fornecer os dados do paciente?

1️⃣ 🌐 Preencher no Site (Recomendado/Mais rápido)
2️⃣ 💬 Continuar por aqui (WhatsApp)

Digite o número:
            `.trim());

            await setUserState(from, {
                currentStep: 'AWAITING_METHOD'
            });
            return;
        }

        await sendMessage(from, 'Digite 1 para Emergência ou 2 para Planejado.');
        return;
    }

    // Step 4: Escolha do Método (Site ou Chat)
    if (state.currentStep === 'AWAITING_METHOD') {
        const option = body.trim();

        if (option === '1') {
            await sendMessage(from, `
Ótimo! Acesse o link seguro para cadastro:
👉 ${process.env.NEXT_PUBLIC_URL}/cadastro?ref=${from}

Assim que preencher, nossa equipe de avaliação receberá os dados.
            `.trim());
            return;
        }

        if (option === '2') {
            await sendMessage(from, `
Certo, vamos fazer por aqui.
Qual o *Nome Completo do Paciente*?
            `.trim());

            await setUserState(from, {
                currentStep: 'AWAITING_PATIENT_NAME'
            });
            return;
        }
    }

    // Step 5: Detecção de Prioridade (Coleta básica)
    if (state.currentStep === 'AWAITING_PATIENT_NAME') {
        // Exemplo simples de coleta e detecção
        const nome = body.trim();
        const priorityKeywords = ['alta', 'hospital', 'sonda', 'uti', 'acamado', 'urgente'];

        // Apenas para demonstração, checando na próxima resposta ou aqui mesmo
        // Num fluxo real, coletaríamos anamnese completa. 

        await sendMessage(from, `
Obrigado. Em qual *Cidade e Bairro* o paciente está?
        `.trim());

        await setUserState(from, {
            currentStep: 'AWAITING_LOCATION',
            data: { ...state.data, nomePaciente: nome }
        });
        return;
    }
}
