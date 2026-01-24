export interface WhatsAppMessage {
    from: string;
    body: string;
    type: 'text' | 'image' | 'document' | 'audio';
    timestamp: number;
    messageId: string;
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
    | 'INTERCORRENCIA';

export interface MessageTemplate {
    text: string;
    buttons?: { id: string; text: string }[];
    document?: {
        buffer: Buffer;
        filename: string;
        caption?: string;
    };
}
