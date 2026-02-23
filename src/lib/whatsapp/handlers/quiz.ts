import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState, setCooldown } from '../state-manager';
import { sendMessage } from '../client';
import logger from '@/lib/observability/logger';

interface Question {
    id: number;
    text: string;
    options: string[];
    correctOption: number; // 1-based index
}

const QUESTIONS: Question[] = [
    {
        id: 1,
        text: "Um paciente idoso engasgou durante a refeição. Qual a primeira ação?",
        options: [
            "Dar água imediatamente",
            "Aplicar a manobra de Heimlich",
            "Colocar deitado",
            "Ligar para o SAMU"
        ],
        correctOption: 2
    },
    {
        id: 2,
        text: "Qual a frequência ideal para mudança de decúbito em paciente acamado?",
        options: [
            "A cada 30 minutos",
            "A cada 2 horas",
            "A cada 6 horas",
            "Uma vez por dia"
        ],
        correctOption: 2
    },
    {
        id: 3,
        text: "O que é PA (Pressão Arterial) considerada normal para um adulto?",
        options: [
            "120x80 mmHg",
            "160x100 mmHg",
            "90x50 mmHg",
            "200x120 mmHg"
        ],
        correctOption: 1
    },
    {
        id: 4,
        text: "Qual destas NÃO é uma atribuição do cuidador?",
        options: [
            "Auxiliar no banho",
            "Administrar medicação oral prescrita",
            "Prescrever medicamentos",
            "Fazer companhia"
        ],
        correctOption: 3
    },
    {
        id: 5,
        text: "O paciente apresenta febre alta (39°C). O que fazer imediatamente?",
        options: [
            "Dar antibiótico por conta própria",
            "Cobrir o paciente com cobertores",
            "Informar familiar/responsável e realizar compressas frias",
            "Ignorar pois passa logo"
        ],
        correctOption: 3
    },
    {
        id: 6,
        text: "Sinais de AVC (Derrame) incluem:",
        options: [
            "Dor no pé",
            "Assimetria facial, perda de força em um lado, fala enrolada",
            "Espirros constantes",
            "Fome excessiva"
        ],
        correctOption: 2
    },
    {
        id: 7,
        text: "O que é Hipoglicemia?",
        options: [
            "Açúcar alto no sangue",
            "Açúcar baixo no sangue",
            "Pressão alta",
            "Batimento cardíaco rápido"
        ],
        correctOption: 2
    },
    {
        id: 8,
        text: "Para prevenir úlceras de pressão (escaras), deve-se:",
        options: [
            "Manter a pele úmida",
            "Deixar o paciente na mesma posição",
            "Manter pele limpa, seca e hidratada, e mudar decúbito",
            "Usar colchão muito duro"
        ],
        correctOption: 3
    },
    {
        id: 9,
        text: "Qual via de administração é usada para insulina?",
        options: [
            "Oral (Comprimido)",
            "Subcutânea (Injeção)",
            "Topica (Pomada)",
            "Ocular (Colírio)"
        ],
        correctOption: 2
    },
    {
        id: 10,
        text: "Ao verificar que o paciente não respira e não tem pulso, você deve:",
        options: [
            "Esperar voltar sozinho",
            "Iniciar RCP (Ressuscitação) e chamar ajuda",
            "Dar um copo d'água",
            "Ir embora"
        ],
        correctOption: 2
    },
    {
        id: 11,
        text: "O que significa GTT?",
        options: [
            "Gastrostomia (Sonda no estômago)",
            "Gripe Total",
            "Grande Tratamento Térmico",
            "Gaze Tamanho Total"
        ],
        correctOption: 1
    },
    {
        id: 12,
        text: "Paciente com Alzheimer agressivo. Como proceder?",
        options: [
            "Gritar com ele",
            "Prender no quarto",
            "Manter a calma, não confrontar e distrair",
            "Agredir de volta"
        ],
        correctOption: 3
    },
    {
        id: 13,
        text: "Qual a posição correta para alimentar um paciente no leito?",
        options: [
            "Totalmente deitado (Horizontal)",
            "Sentado ou elevado (Fowler - 45° a 90°)",
            "De barriga para baixo",
            "De cabeça para baixo"
        ],
        correctOption: 2
    },
    {
        id: 14,
        text: "Saturação de oxigênio normal em ar ambiente é:",
        options: [
            "Abaixo de 80%",
            "Entre 95% e 100%",
            "50%",
            "10%"
        ],
        correctOption: 2
    },
    {
        id: 15,
        text: "Frequência Cardíaca (FC) normal em repouso varia geralmente entre:",
        options: [
            "10 e 20 bpm",
            "60 e 100 bpm",
            "150 e 200 bpm",
            "0 bpm"
        ],
        correctOption: 2
    }
];

const PASSING_SCORE_PERCENT = 70;
const COOLDOWN_MINUTES = 5;

export async function handleQuiz(
    message: WhatsAppMessage,
    state: UserState
) {
    const { from, body } = message;
    const { checkCooldown, getCooldownTTL } = await import('../state-manager');

    // 1. Verificar Cooldown
    const inCooldown = await checkCooldown(from);
    if (inCooldown) {
        const ttl = await getCooldownTTL(from);
        const minutes = Math.ceil(ttl / 60);
        await sendMessage(from, `⏳ *Aguarde um pouco!* \n\nVocê tentou recentemente e precisa aguardar mais *${minutes} minuto(s)* para tentar o quiz novamente. Aproveite para revisar seus conhecimentos!`);
        return;
    }

    // Se estiver no Welcome do Quiz
    if (state.currentStep === 'WELCOME') {

        const area = state.data.area || 'Não informada';

        await sendMessage(from, `
📝 *Triagem de Competência: ${area}*

Vou fazer 15 perguntas rápidas para validar seus conhecimentos.
Para ser aprovado(a), você precisa acertar pelo menos ${PASSING_SCORE_PERCENT}%.

Digite *INICIAR* para começar.
        `.trim());

        await setUserState(from, {
            currentStep: 'READY_TO_START'
        });
        return;
    }

    if (state.currentStep === 'READY_TO_START') {
        await sendQuestion(from, 0); // Envia primeira pergunta (índice 0)
        return;
    }

    // Processando respostas
    if (state.currentStep.startsWith('QUESTION_')) {
        const currentIndex = parseInt(state.currentStep.split('_')[1]);
        const answer = parseInt(body.trim());

        // Validação básica
        if (isNaN(answer) || answer < 1 || answer > 4) {
            await sendMessage(from, '⚠️ Opção inválida. Digite apenas 1, 2, 3 ou 4.');
            return;
        }

        // Registrar resposta
        const question = QUESTIONS[currentIndex];
        const isCorrect = answer === question.correctOption;

        const currentData = state.data || {};
        const newScore = (currentData.score || 0) + (isCorrect ? 1 : 0);

        // Feedback imediato (opcional, mas bom para engajamento)
        if (isCorrect) {
            // await sendMessage(from, '✅');
        } else {
            // await sendMessage(from, '❌');
        }

        const nextIndex = currentIndex + 1;

        // Se acabou as perguntas
        if (nextIndex >= QUESTIONS.length) {
            await finishQuiz(from, newScore);
        } else {
            // Próxima pergunta
            await setUserState(from, {
                data: {
                    ...currentData,
                    score: newScore
                }
            });
            await sendQuestion(from, nextIndex);
        }
    }
}

async function sendQuestion(phone: string, index: number) {
    const q = QUESTIONS[index];
    const optionsText = q.options.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n');

    await sendMessage(phone, `
❓ *Pergunta ${index + 1}/${QUESTIONS.length}*

${q.text}

${optionsText}

_Digite o número da resposta:_
    `.trim());

    await setUserState(phone, {
        currentStep: `QUESTION_${index}`
    });
}

async function finishQuiz(phone: string, score: number) {
    const total = QUESTIONS.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= PASSING_SCORE_PERCENT;

    const state = await import('../state-manager').then(m => m.getUserState(phone));
    const area = state?.data?.area || 'Cuidador';

    // 1. Persistir no Banco de Dados (Real)
    try {
        const { DB } = await import('@/lib/database');
        await DB.cuidador.upsert(phone, {
            quizScore: percentage,
            status: passed ? 'AGUARDANDO_RH' : 'REPROVADO_TRIAGEM',
            area: area,
            nome: state?.data?.nome || null
        });
    } catch (_e) {
        await logger.error('wa_quiz_persistencia_erro', 'Erro ao persistir resultado do quiz', _e instanceof Error ? _e : undefined);
    }

    if (passed) {
        await sendMessage(phone, `
🎉 *Parabéns! Você foi aprovado(a)!*

✅ Acertos: ${score}/${total} (${percentage}%)

Seu perfil foi encaminhado para nossa equipe de *Recursos Humanos*. 
Aguarde nosso contato para agendar sua entrevista.

Status: *AGUARDANDO_RH* 🕒
        `.trim());

        await setUserState(phone, {
            currentFlow: 'AGUARDANDO_RH',
            currentStep: 'WAITING',
            data: {
                ...state?.data,
                quizScore: percentage,
                quizDate: new Date().toISOString()
            }
        });

    } else {
        await sendMessage(phone, `
❌ *Resultado Insuficiente*

Sua pontuação: ${score}/${total} (${percentage}%)
Mínimo necessário: ${PASSING_SCORE_PERCENT}%

Você não atingiu a pontuação mínima para avançar agora.
Mas não desanime! Estude um pouco mais e tente novamente.

⏳ *Aguarde 5 minutos para tentar de novo.*
        `.trim());

        // Aplicar Cooldown
        await setCooldown(phone, COOLDOWN_MINUTES);

        await setUserState(phone, {
            currentFlow: 'REPROVADO_TRIAGEM',
            currentStep: 'COOLDOWN',
            data: {
                ...state?.data,
                lastScore: percentage
            }
        });
    }
}

