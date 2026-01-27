import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';
import { prisma } from '@/lib/db';

const AREAS = {
    '1': 'CUIDADOR',
    '2': 'TECNICO_ENF',
    '3': 'AUXILIAR_ENF',
    '4': 'ENFERMEIRO',
    '5': 'OUTRO',
};

const AREA_LABELS: Record<string, string> = {
    'CUIDADOR': 'Cuidador(a) de Idosos',
    'TECNICO_ENF': 'Técnico(a) de Enfermagem',
    'AUXILIAR_ENF': 'Auxiliar de Enfermagem',
    'ENFERMEIRO': 'Enfermeiro(a)',
    'OUTRO': 'Outros',
};

export async function handleCadastroCuidador(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    // Extrair número para armazenamento de estado (remover @lid ou @s.whatsapp.net)
    const phone = from.replace('@s.whatsapp.net', '').replace('@lid', '');

    console.log(`🚀 HandleCadastroCuidador: Step atual = ${state.currentStep}, De = ${from} (phone: ${phone})`);

    // Step 1: Área de atuação
    if (state.currentStep === 'AWAITING_AREA') {
        const area = AREAS[body.trim() as keyof typeof AREAS];

        if (!area) {
            await sendMessage(from, 'Opção inválida. Digite 1, 2, 3, 4 ou 5.');
            return;
        }

        await sendMessage(from, 'Qual seu nome completo?');

        await setUserState(phone, {
            currentStep: 'AWAITING_NOME',
            data: { ...state.data, area },
        });
        return;
    }

    // Step 2: Nome
    if (state.currentStep === 'AWAITING_NOME') {
        await sendMessage(from, 'Qual seu CPF? (somente números)');

        await setUserState(phone, {
            currentStep: 'AWAITING_CPF',
            data: { ...state.data, nome: body.trim() },
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

        await setUserState(phone, {
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

        await setUserState(phone, {
            currentStep: 'AWAITING_COREN',
            data: { ...state.data, email: body.trim() },
        });
        return;
    }

    // Step 5: COREN
    if (state.currentStep === 'AWAITING_COREN') {
        const coren = body.toUpperCase() === 'NÃO' ? null : body.trim();

        await sendMessage(from, 'Qual cidade você atua?');

        await setUserState(phone, {
            currentStep: 'AWAITING_CIDADE',
            data: { ...state.data, coren },
        });
        return;
    }

    // Step 6: Cidade
    if (state.currentStep === 'AWAITING_CIDADE') {
        await sendMessage(from, 'Quais bairros você pode atender? (separe por vírgula)');

        await setUserState(phone, {
            currentStep: 'AWAITING_BAIRROS',
            data: { ...state.data, cidade: body.trim() },
        });
        return;
    }

    // Step 7: Bairros - Finaliza cadastro
    if (state.currentStep === 'AWAITING_BAIRROS') {
        const bairros = body.split(',').map(b => b.trim()).join(', ');

        const dadosCompletos = {
            ...state.data,
            bairros,
            telefone: phone,
        };

        // Persistir no Banco de Dados usando Prisma
        try {
            const cuidador = await prisma.cuidador.upsert({
                where: { telefone: phone },
                update: {
                    nome: dadosCompletos.nome as string,
                    area: dadosCompletos.area as string,
                    status: 'CANDIDATO',
                    endereco: `${bairros}, ${dadosCompletos.cidade}`,
                },
                create: {
                    telefone: phone,
                    nome: dadosCompletos.nome as string || null,
                    area: dadosCompletos.area as string || null,
                    status: 'CANDIDATO',
                    endereco: `${bairros}, ${dadosCompletos.cidade}`,
                },
            });
            console.log(`✅ [DB] Candidato cuidador salvo: ${cuidador.id} - ${phone}`);
        } catch (error) {
            console.error('❌ [DB] Erro ao salvar candidato cuidador:', error);
        }

        const areaLabel = AREA_LABELS[dadosCompletos.area as string] || dadosCompletos.area;

        await sendMessage(from, `
Perfeito, ${dadosCompletos.nome}! 👏

📋 *Resumo do seu cadastro:*

👤 *Nome:* ${dadosCompletos.nome}
💼 *Área:* ${areaLabel}
📍 *Local:* ${bairros}, ${dadosCompletos.cidade}
📧 *Email:* ${dadosCompletos.email}
${dadosCompletos.coren ? `🏥 *COREN:* ${dadosCompletos.coren}` : ''}

Nossa equipe de RH entrará em contato para agendar uma entrevista e continuar o processo seletivo.

Digite *MENU* para ver opções ou *AJUDA* para falar conosco.
        `.trim());

        await setUserState(phone, {
            currentFlow: 'AGUARDANDO_RH',
            currentStep: 'CADASTRO_COMPLETO',
            data: {
                ...dadosCompletos,
                cadastroCompleto: true,
                dataCadastro: new Date().toISOString(),
            },
        });
        return;
    }
}
