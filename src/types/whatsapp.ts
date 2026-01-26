export interface WhatsAppMessage {
    from: string;
    body: string;
    type: 'text' | 'image' | 'document' | 'audio' | 'button_reply' | 'list_reply';
    timestamp: number;
    messageId: string;
    // Button response data
    buttonResponse?: {
        id: string;
        text: string;
        payload?: Record<string, string>;
    } | null;
    // List response data
    listResponse?: {
        id: string;
        title: string;
        description?: string;
    } | null;
}

export type FlowType =
    | 'IDLE'
    | 'ONBOARDING'
    | 'CADASTRO_CUIDADOR'
    | 'CADASTRO_PACIENTE'
    | 'AGUARDANDO_ACEITE_ORCAMENTO'
    | 'AGUARDANDO_ASSINATURA'
    | 'OFERTA_PLANTAO'
    | 'ESCOLHA_SLOT'
    | 'CHECKIN_PLANTAO'
    | 'CHECKOUT_PLANTAO'
    | 'INTERCORRENCIA'
    | 'MAIN_MENU'
    | 'QUIZ'
    | 'REPROVADO_TRIAGEM'
    | 'AGUARDANDO_RH'
    | 'AGUARDANDO_AVALIACAO';

export interface MessageTemplate {
    text: string;
    buttons?: { id: string; text: string; payload?: string }[];
    document?: {
        buffer: Buffer;
        filename: string;
        caption?: string;
    };
}

/**
 * Button configuration for interactive messages
 * Conforme WhatsApp Business API specs:
 * - Max 3 buttons
 * - Title max 20 characters
 * - Payload for dynamic context
 */
export interface ButtonConfig {
    id: string;
    text: string;
    payload?: string;
    nextStep?: string;
}

/**
 * List section for list messages
 */
export interface ListSection {
    title: string;
    rows: {
        id: string;
        title: string;
        description?: string;
        nextStep?: string;
    }[];
}
