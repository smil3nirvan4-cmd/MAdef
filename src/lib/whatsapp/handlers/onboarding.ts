import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';
import { notifyEmergencyTeam } from '@/lib/notifications/emergency';
import { prisma } from '@/lib/db';
import { buildAppUrl } from '@/lib/config/public-url';
import logger from '@/lib/observability/logger';

// Salvar lead de paciente no banco de dados
async function savePatientLead(phone: string, data: Record<string, unknown>) {
    try {
        // Usar upsert para criar ou atualizar
        const paciente = await prisma.paciente.upsert({
            where: { telefone: phone },
            update: {
                nome: (data.nomePaciente as string) || undefined,
                cidade: (data.cidade as string) || undefined,
                bairro: (data.bairro as string) || undefined,
                tipo: (data.tipoCuidado as string) || 'HOME_CARE',
                hospital: (data.hospital as string) || undefined,
                prioridade: data.isEmergency ? 'URGENTE' : 'NORMAL',
                status: 'LEAD',
            },
            create: {
                telefone: phone,
                nome: (data.nomePaciente as string) || null,
                cidade: (data.cidade as string) || null,
                bairro: (data.bairro as string) || null,
                tipo: (data.tipoCuidado as string) || 'HOME_CARE',
                hospital: (data.hospital as string) || null,
                prioridade: data.isEmergency ? 'URGENTE' : 'NORMAL',
                status: 'LEAD',
            },
        });
        await logger.whatsapp('wa_patient_lead_saved', 'Lead de paciente salvo no banco', { phone, pacienteId: paciente.id });
        return paciente;
    } catch (error) {
        await logger.error('wa_patient_lead_save_error', 'Erro ao salvar lead de paciente', error instanceof Error ? error : undefined);
        return null;
    }
}

// Salvar candidato cuidador no banco de dados
async function saveCaregiverCandidate(phone: string, data: Record<string, unknown>) {
    try {
        const cuidador = await prisma.cuidador.upsert({
            where: { telefone: phone },
            update: {
                nome: (data.nome as string) || undefined,
                area: (data.area as string) || undefined,
                status: 'CANDIDATO',
            },
            create: {
                telefone: phone,
                nome: (data.nome as string) || null,
                area: (data.area as string) || null,
                status: 'CANDIDATO',
            },
        });
        await logger.whatsapp('wa_caregiver_candidate_saved', 'Candidato cuidador salvo no banco', { phone, cuidadorId: cuidador.id });
        return cuidador;
    } catch (error) {
        await logger.error('wa_caregiver_candidate_save_error', 'Erro ao salvar candidato cuidador', error instanceof Error ? error : undefined);
        return null;
    }
}

export async function handleOnboarding(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    // Extrair número para armazenamento de estado (remover @lid ou @s.whatsapp.net)
    const phone = from.replace('@s.whatsapp.net', '').replace('@lid', '');

    await logger.whatsapp('wa_onboarding_step', 'Processando step de onboarding', { phone, currentStep: state.currentStep, from });

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

        await setUserState(phone, {
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

            await setUserState(phone, {
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

            await setUserState(phone, {
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

            await notifyEmergencyTeam(from);

            // Resetar ou pausar estado
            await setUserState(phone, {
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

            await setUserState(phone, {
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
            let signupUrl = '';
            try {
                signupUrl = buildAppUrl(`/cadastro?ref=${encodeURIComponent(from)}`);
            } catch (error) {
                await logger.error('wa_onboarding_url_error', 'Erro ao montar URL pública de cadastro', error instanceof Error ? error : undefined);
                await sendMessage(from, 'No momento, o link de cadastro está indisponível. Nossa equipe vai te atender por aqui.');
                await setUserState(phone, {
                    currentStep: 'AWAITING_PATIENT_NAME'
                });
                return;
            }

            await sendMessage(from, `
Ótimo! Acesse o link seguro para cadastro:
👉 ${signupUrl}

Assim que preencher, nossa equipe de avaliação receberá os dados.
            `.trim());
            return;
        }

        if (option === '2') {
            await sendMessage(from, `
Certo, vamos fazer por aqui.
Qual o *Nome Completo do Paciente*?
            `.trim());

            await setUserState(phone, {
                currentStep: 'AWAITING_PATIENT_NAME'
            });
            return;
        }
    }

    // Step 5: Detecção de Prioridade (Coleta básica)
    if (state.currentStep === 'AWAITING_PATIENT_NAME') {
        const nome = body.trim();
        const priorityKeywords = ['alta', 'hospital', 'sonda', 'uti', 'acamado', 'urgente'];

        const hasPriorityKeyword = priorityKeywords.some(keyword =>
            nome.toLowerCase().includes(keyword)
        );

        await sendMessage(from, `
Obrigado. Em qual *Cidade e Bairro* o paciente está?
        `.trim());

        await setUserState(phone, {
            currentStep: 'AWAITING_LOCATION',
            data: {
                ...state.data,
                nomePaciente: nome,
                prioridade: hasPriorityKeyword ? 'ALTA' : 'NORMAL'
            }
        });
        return;
    }

    // Step 6: Coleta de Localização
    if (state.currentStep === 'AWAITING_LOCATION') {
        const localizacao = body.trim();
        const parts = localizacao.split(',').map(p => p.trim());
        const cidade = parts[0] || localizacao;
        const bairro = parts[1] || '';

        await sendMessage(from, `
Entendi! ${cidade}${bairro ? `, ${bairro}` : ''}.

Qual o *tipo de cuidado* necessário?

1️⃣ Cuidado Domiciliar (Home Care)
2️⃣ Acompanhamento Hospitalar (Plantão)

Digite o número:
        `.trim());

        await setUserState(phone, {
            currentStep: 'AWAITING_CARE_TYPE',
            data: {
                ...state.data,
                cidade,
                bairro
            }
        });
        return;
    }

    // Step 7: Tipo de Cuidado
    if (state.currentStep === 'AWAITING_CARE_TYPE') {
        const option = body.trim();

        if (option === '1' || option === '2') {
            const tipoCuidado = option === '1' ? 'HOME_CARE' : 'HOSPITAL';

            await sendMessage(from, `
Qual a *condição principal* do paciente?

1️⃣ Idoso com dificuldade de locomoção
2️⃣ Pós-operatório
3️⃣ Doença crônica (diabetes, hipertensão, etc)
4️⃣ Demência/Alzheimer
5️⃣ Acamado
6️⃣ Outro

Digite o número:
            `.trim());

            await setUserState(phone, {
                currentStep: 'AWAITING_CONDITION',
                data: {
                    ...state.data,
                    tipoCuidado
                }
            });
            return;
        }

        await sendMessage(from, 'Digite 1 para Cuidado Domiciliar ou 2 para Acompanhamento Hospitalar.');
        return;
    }

    // Step 8: Condição do Paciente
    if (state.currentStep === 'AWAITING_CONDITION') {
        const option = body.trim();
        const condicoes: Record<string, string> = {
            '1': 'IDOSO_LOCOMOCAO',
            '2': 'POS_OPERATORIO',
            '3': 'DOENCA_CRONICA',
            '4': 'DEMENCIA',
            '5': 'ACAMADO',
            '6': 'OUTRO'
        };

        const condicao = condicoes[option];
        if (!condicao) {
            await sendMessage(from, 'Digite um número de 1 a 6.');
            return;
        }

        await sendMessage(from, `
Quantas *horas por dia* de cuidado são necessárias?

1️⃣ 6 horas (meio período)
2️⃣ 12 horas (período integral)
3️⃣ 24 horas (cuidado contínuo)

Digite o número:
        `.trim());

        await setUserState(phone, {
            currentStep: 'AWAITING_HOURS',
            data: {
                ...state.data,
                condicao
            }
        });
        return;
    }

    // Step 9: Horas de Cuidado
    if (state.currentStep === 'AWAITING_HOURS') {
        const option = body.trim();
        const horasMap: Record<string, number> = {
            '1': 6,
            '2': 12,
            '3': 24
        };

        const horasDiarias = horasMap[option];
        if (!horasDiarias) {
            await sendMessage(from, 'Digite 1, 2 ou 3.');
            return;
        }

        await sendMessage(from, `
Perfeito! Resumo do seu pedido:

👤 *Paciente:* ${state.data?.nomePaciente || 'Não informado'}
📍 *Local:* ${state.data?.cidade || 'Não informado'}${state.data?.bairro ? `, ${state.data.bairro}` : ''}
🏥 *Tipo:* ${state.data?.tipoCuidado === 'HOME_CARE' ? 'Cuidado Domiciliar' : 'Acompanhamento Hospitalar'}
⏰ *Horas:* ${horasDiarias}h/dia

Nossa equipe de avaliação entrará em contato em breve para agendar uma visita e elaborar um orçamento personalizado.

📞 Se precisar de algo urgente, digite *AJUDA*.

Obrigado por escolher a Mãos Amigas! 🤝
        `.trim());

        await setUserState(phone, {
            currentFlow: 'AGUARDANDO_AVALIACAO',
            currentStep: 'CADASTRO_COMPLETO',
            data: {
                ...state.data,
                horasDiarias,
                cadastroCompleto: true,
                dataCadastro: new Date().toISOString()
            }
        });

        // Salvar lead no banco de dados
        await savePatientLead(phone, {
            ...state.data,
            horasDiarias,
        });

        return;
    }
}
