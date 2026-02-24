import { describe, it, expect } from 'vitest';
import { notDeleted, softDeleteData, includeDeleted } from './soft-delete';

describe('soft-delete utilities', () => {
    it('notDeleted filters out deleted records', () => {
        expect(notDeleted).toEqual({ deletedAt: null });
    });

    it('softDeleteData returns current date', () => {
        const before = Date.now();
        const data = softDeleteData();
        const after = Date.now();
        expect(data.deletedAt).toBeInstanceOf(Date);
        expect(data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
        expect(data.deletedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('includeDeleted is empty object', () => {
        expect(includeDeleted).toEqual({});
    });
});
