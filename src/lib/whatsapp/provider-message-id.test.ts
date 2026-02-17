import { describe, expect, it } from 'vitest';
import { extractProviderMessageId } from './provider-message-id';

describe('extractProviderMessageId', () => {
    it('extracts direct messageId/id fields', () => {
        expect(extractProviderMessageId({ messageId: 'abc123' })).toBe('abc123');
        expect(extractProviderMessageId({ id: 'xyz987' })).toBe('xyz987');
    });

    it('extracts Baileys-like key.id shapes', () => {
        expect(extractProviderMessageId({ key: { id: 'k1' } })).toBe('k1');
        expect(extractProviderMessageId({ data: { key: { id: 'k2' } } })).toBe('k2');
        expect(extractProviderMessageId({ messages: [{ key: { id: 'k3' } }] })).toBe('k3');
    });

    it('returns null when payload has no usable id', () => {
        expect(extractProviderMessageId({})).toBeNull();
        expect(extractProviderMessageId(null)).toBeNull();
        expect(extractProviderMessageId(undefined)).toBeNull();
    });
});

