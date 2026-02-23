// Core business repositories
export { pacienteRepository } from './paciente.repository';
export type { PacienteListParams } from './paciente.repository';

export { cuidadorRepository } from './cuidador.repository';
export type { CuidadorListParams } from './cuidador.repository';

export { avaliacaoRepository } from './avaliacao.repository';
export type { AvaliacaoListParams } from './avaliacao.repository';

export { alocacaoRepository } from './alocacao.repository';
export type { AlocacaoListParams } from './alocacao.repository';

export { orcamentoRepository } from './orcamento.repository';
export type { OrcamentoListParams } from './orcamento.repository';

export { mensagemRepository } from './mensagem.repository';
export type { MensagemListParams } from './mensagem.repository';

// WhatsApp admin repositories
export {
    whatsappQueueRepository,
    whatsappFlowStateRepository,
    whatsappFlowDefinitionRepository,
    whatsappLabelRepository,
    whatsappTemplateRepository,
    whatsappQuickReplyRepository,
    whatsappAutoReplyRepository,
    whatsappWebhookRepository,
    whatsappBlacklistRepository,
    whatsappScheduledRepository,
    whatsappContactRepository,
    whatsappSettingRepository,
} from './whatsapp-admin.repository';
export type { QueueListParams } from './whatsapp-admin.repository';

// System repositories
export { systemLogRepository } from './system-log.repository';
export type { SystemLogListParams } from './system-log.repository';

export { dashboardRepository } from './dashboard.repository';
