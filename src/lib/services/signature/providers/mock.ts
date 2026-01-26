import { ISignatureProvider, ContractRequest, SignaturelinkResponse } from '../types';

export class MockSignatureProvider implements ISignatureProvider {
    async createEnvelope(request: ContractRequest): Promise<SignaturelinkResponse> {
        console.log('📝 [MOCK] Criando envelope de assinatura:', request.title);

        // Simula criação de link
        const envelopeId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        // Em dev, podemos retornar um link para uma rota interna que simula a assinatura ou apenas um link placeholder
        // Para ficar realista, vamos gerar um link que "funciona" visualmente (ex: vai para uma pagina de sucesso)
        const link = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/legal/contrato/${envelopeId}`;

        return {
            envelopeId,
            signingUrl: link,
            status: 'CREATED'
        };
    }

    async checkStatus(envelopeId: string): Promise<'PENDING' | 'SIGNED' | 'REJECTED'> {
        // Mock: Sempre retorna SIGNED para facilitar teste, ou aleatório
        // Vamos simular: Se o ID termina em par, assinado. Impar, pendente.
        const digit = parseInt(envelopeId.slice(-1), 10);
        return 'SIGNED';
    }
}
