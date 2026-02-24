import { describe, it, expect } from 'vitest';
import { escapeHtml, stripHtmlTags, sanitizeString, sanitizeObject, sanitizePhone } from '../sanitize';

describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('escapes ampersands', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('returns plain text unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});

describe('stripHtmlTags', () => {
    it('strips HTML tags', () => {
        expect(stripHtmlTags('<b>bold</b> text')).toBe('bold text');
    });

    it('strips script tags', () => {
        expect(stripHtmlTags('<script>evil()</script>safe')).toBe('evil()safe');
    });

    it('handles nested tags', () => {
        expect(stripHtmlTags('<div><p>text</p></div>')).toBe('text');
    });
});

describe('sanitizeString', () => {
    it('strips tags and trims', () => {
        expect(sanitizeString('  <b>hello</b>  ')).toBe('hello');
    });
});

describe('sanitizeObject', () => {
    it('sanitizes string values in object', () => {
        const result = sanitizeObject({
            name: '<script>alert(1)</script>Maria',
            age: 30,
            address: { street: '<b>Rua A</b>' },
        });

        expect(result.name).toBe('alert(1)Maria');
        expect(result.age).toBe(30);
        expect((result.address as any).street).toBe('Rua A');
    });

    it('handles empty objects', () => {
        expect(sanitizeObject({})).toEqual({});
    });
});

describe('sanitizePhone', () => {
    it('removes non-digit characters except +', () => {
        expect(sanitizePhone('+55 (11) 9999-0000')).toBe('+551199990000');
    });

    it('keeps digits only for local numbers', () => {
        expect(sanitizePhone('11999990000')).toBe('11999990000');
    });
});
