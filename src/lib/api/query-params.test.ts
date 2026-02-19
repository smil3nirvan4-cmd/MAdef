import { describe, expect, it } from 'vitest';
import { parseFilter, parsePagination, parseSort } from './query-params';

describe('query-params helpers', () => {
    it('clamps pagination values', () => {
        const url = new URL('http://localhost/api/test?page=0&pageSize=999');
        expect(parsePagination(url)).toEqual({ page: 1, pageSize: 100 });
    });

    it('clamps pageSize above 100', () => {
        const url = new URL('http://localhost/api/test?page=2&pageSize=1000');
        expect(parsePagination(url)).toEqual({ page: 2, pageSize: 100 });
    });

    it('falls back to default sort when field is not allowed', () => {
        const url = new URL('http://localhost/api/test?sort=unknown:asc');
        expect(parseSort(url, ['createdAt', 'status'])).toEqual({
            field: 'createdAt',
            direction: 'asc',
        });
    });

    it('falls back to default sort when format is invalid', () => {
        const url = new URL('http://localhost/api/test?sort=invalid-format');
        expect(parseSort(url, ['createdAt', 'status'])).toEqual({
            field: 'createdAt',
            direction: 'desc',
        });
    });

    it('ignores non-allowed filter fields', () => {
        const url = new URL('http://localhost/api/test?filter=status:pending,unknown:test');
        expect(parseFilter(url, ['status', 'intent'])).toEqual({
            status: 'pending',
        });
    });

    it('extracts simple filter format', () => {
        const url = new URL('http://localhost/api/test?filter=status:pending');
        expect(parseFilter(url, ['status'])).toEqual({
            status: 'pending',
        });
    });
});
