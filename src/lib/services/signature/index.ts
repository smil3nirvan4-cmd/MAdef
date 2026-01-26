import { ISignatureProvider } from './types';
import { MockSignatureProvider } from './providers/mock';

// Factory para instanciar o provedor correto baseado em ENV
export function getSignatureProvider(): ISignatureProvider {
    const provider = process.env.SIGNATURE_PROVIDER || 'MOCK';

    switch (provider.toUpperCase()) {
        case 'DOCUSIGN':
            // Retornar DocusignProvider (futuro)
            throw new Error('Docusign provider not implemented yet');
        case 'CLICKSIGN':
            // Retornar ClicksignProvider (futuro)
            throw new Error('Clicksign provider not implemented yet');
        case 'MOCK':
        default:
            return new MockSignatureProvider();
    }
}
