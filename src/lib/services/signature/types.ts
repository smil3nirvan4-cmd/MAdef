
export interface Signer {
    name: string;
    email: string;
    phone?: string;
}

export interface ContractRequest {
    title: string;
    templateId?: string; // ID do template na plataforma (DocuSign/ClickSign)
    signers: Signer[];
    content?: string; // Conteúdo HTML/Texto se não usar template
    metadata?: Record<string, any>;
}

export interface SignaturelinkResponse {
    envelopeId: string;
    signingUrl: string; // Link para enviar ao usuário
    status: 'CREATED' | 'SENT' | 'ERROR';
}

export interface ISignatureProvider {
    createEnvelope(request: ContractRequest): Promise<SignaturelinkResponse>;
    checkStatus(envelopeId: string): Promise<'PENDING' | 'SIGNED' | 'REJECTED'>;
}
