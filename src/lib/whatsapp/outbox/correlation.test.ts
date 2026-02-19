import { describe, expect, it } from 'vitest';
import { buildQueueCorrelationTerms } from './correlation';

describe('buildQueueCorrelationTerms', () => {
    it('returns deduplicated terms including provider/resolved ids', () => {
        const terms = buildQueueCorrelationTerms({
            queueItemId: 'qi_123',
            internalMessageId: 'im_123',
            idempotencyKey: 'idem_123',
            providerMessageId: 'wa_123',
            resolvedMessageId: 'wa_123',
            phone: '5511999999999',
            jid: '5511999999999@s.whatsapp.net',
        });

        expect(terms).toEqual([
            'qi_123',
            'im_123',
            'idem_123',
            'wa_123',
            '5511999999999',
            '5511999999999@s.whatsapp.net',
        ]);
    });

    it('filters blanks and very short values', () => {
        const terms = buildQueueCorrelationTerms({
            queueItemId: '  ',
            internalMessageId: 'abc',
            idempotencyKey: null,
            providerMessageId: '  wa_987  ',
        });

        expect(terms).toEqual(['wa_987']);
    });
});
