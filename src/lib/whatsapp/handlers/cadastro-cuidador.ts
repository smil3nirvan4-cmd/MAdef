import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

const AREAS = {
    '1': 'CUIDADOR',
    '2': 'TECNICO_ENF',
    '3': 'AUXILIAR_ENF',
    '4': 'ENFERMEIRO',
    '5': 'OUTRO',
};

export async function handleCadastroCuidador(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;

    // Step 1: Área de atuação
    if (state.currentStep === 'AWAITING_AREA') {
        const area = AREAS[body.trim() as keyof typeof AREAS];

        if (!area) {
            await sendMessage(from, 'Opção inválida. Digite 1, 2, 3, 4 ou 5.');
            return;
        }

        await sendMessage(from, 'Qual seu nome completo?');

        await setUserState(from, {
            currentStep: 'AWAITING_NOME',
            data: { ...state.data, area },
        });
        return;
    }

    // Step 2: Nome
    if (state.currentStep === 'AWAITING_NOME') {
        await sendMessage(from, 'Qual seu CPF? (somente números)');

        await setUserState(from, {
            currentStep: 'AWAITING_CPF',
            data: { ...state.data, nome: body },
        });
        return;
    }

    // Step 3: CPF
    if (state.currentStep === 'AWAITING_CPF') {
        const cpf = body.replace(/\D/g, '');

        if (cpf.length !== 11) {
            await sendMessage(from, 'CPF inválido. Digite os 11 dígitos:');
            return;
        }

        await sendMessage(from, 'Qual seu email?');

        await setUserState(from, {
            currentStep: 'AWAITING_EMAIL',
            data: { ...state.data, cpf },
        });
        return;
    }

    // Step 4: Email
    if (state.currentStep === 'AWAITING_EMAIL') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(body)) {
            await sendMessage(from, 'Email inválido. Digite um email válido:');
            return;
        }

        await sendMessage(from, 'Você tem registro no COREN? (Digite o número ou "NÃO")');

        await setUserState(from, {
            currentStep: 'AWAITING_COREN',
            data: { ...state.data, email: body },
        });
        return;
    }

    // Step 5: COREN
    if (state.currentStep === 'AWAITING_COREN') {
        const coren = body.toUpperCase() === 'NÃO' ? null : body;

        await sendMessage(from, 'Qual cidade você atua?');

        await setUserState(from, {
            currentStep: 'AWAITING_CIDADE',
            data: { ...state.data, coren },
        });
        return;
    }

    // Step 6: Cidade
    if (state.currentStep === 'AWAITING_CIDADE') {
        await sendMessage(from, 'Quais bairros você pode atender? (separe por vírgula)');

        await setUserState(from, {
            currentStep: 'AWAITING_BAIRROS',
            data: { ...state.data, cidade: body },
        });
        return;
    }

    // Step 7: Bairros - Finaliza cadastro
    if (state.currentStep === 'AWAITING_BAIRROS') {
        const bairros = body.split(',').map(b => b.trim());

        const dadosCompletos: any = {
            ...state.data,
            bairros,
            telefone: from,
        };

        // Persistir no Banco de Dados
        const { DB } = await import('@/lib/database');
        await DB.cuidador.upsert(from, {
            nome: dadosCompletos.nome,
            area: dadosCompletos.area,
            status: 'TRIAGEM_PENDENTE', // Novo status para candidatos que ainda não fizeram o quiz
            endereco: `${body}, ${dadosCompletos.cidade}`
        });

        await sendMessage(from, `
Perfeito, ${dadosCompletos.nome}! 👏

Para garantir a qualidade do nosso atendimento, todos os profissionais passam por um rápido teste de conhecimentos.

Vou te transferir para o *Quiz de Triagem*. Digite *OK* para começar.
        `.trim());

        await setUserState(from, {
            currentFlow: 'QUIZ',
            currentStep: 'WELCOME',
            data: dadosCompletos,
        });
        return;
    }
}
