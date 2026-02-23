import { buildAppUrl } from '@/lib/config/public-url';
import logger from '@/lib/observability/logger';
import { ISignatureProvider, ContractRequest, SignaturelinkResponse } from '../types';

export class MockSignatureProvider implements ISignatureProvider {
    async createEnvelope(request: ContractRequest): Promise<SignaturelinkResponse> {
        void logger.info('mock_signature_create', 'Criando envelope de assinatura (mock)', { title: request.title });

        const envelopeId = `env_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const link = buildAppUrl(`/legal/contrato/${envelopeId}`);

        return {
            envelopeId,
            signingUrl: link,
            status: 'CREATED',
        };
    }

    async checkStatus(_envelopeId: string): Promise<'PENDING' | 'SIGNED' | 'REJECTED'> {
        return 'SIGNED';
    }
}
