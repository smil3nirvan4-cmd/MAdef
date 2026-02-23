import { describe, expect, it } from 'vitest';
import {
    extractPlaceholders,
    renderContract,
    validateRequiredPlaceholders,
} from './template-engine';

describe('contract template engine', () => {
    it('extrai placeholders unicos e ordenados', () => {
        const placeholders = extractPlaceholders('<<paciente.nome>> <<preco.total>> <<paciente.nome>>');
        expect(placeholders).toEqual(['paciente.nome', 'preco.total']);
    });

    it('renderiza placeholders simples', () => {
        const rendered = renderContract('Paciente: <<paciente.nome>>', {
            paciente: { nome: 'Maria' },
        });
        expect(rendered.content).toContain('Paciente: Maria');
        expect(rendered.pending).toEqual([]);
    });

    it('renderiza path profundo', () => {
        const rendered = renderContract('Total: <<preco.total>>', {
            preco: { total: 1234.56 },
        });
        expect(rendered.content).toContain('1234.56');
    });

    it('mantem placeholder quando valor esta ausente', () => {
        const rendered = renderContract('Contrato <<orcamento.id>>', {});
        expect(rendered.content).toContain('<<orcamento.id>>');
        expect(rendered.pending).toEqual(['orcamento.id']);
    });

    it('acumula pendencias sem duplicar', () => {
        const rendered = renderContract('<<a>> <<a>> <<b>>', {});
        expect(rendered.pending).toEqual(['a', 'b']);
    });

    it('considera string vazia como pendencia', () => {
        const rendered = renderContract('Paciente <<paciente.nome>>', {
            paciente: { nome: '' },
        });
        expect(rendered.pending).toEqual(['paciente.nome']);
    });

    it('serializa objetos em JSON quando necessario', () => {
        const rendered = renderContract('Debug <<obj>>', { obj: { a: 1 } });
        expect(rendered.content).toContain('{"a":1}');
    });

    it('valida placeholders obrigatorios ausentes', () => {
        const missing = validateRequiredPlaceholders(['paciente.nome', 'preco.total']);
        expect(missing.length).toBeGreaterThan(0);
        expect(missing).toContain('orcamento.id');
    });

    it('nao acusa faltas quando obrigatorios presentes', () => {
        const all = [
            'orcamento.id',
            'paciente.nome',
            'unidade.nome',
            'contrato.tipo',
            'preco.total',
            'preco.prestador',
            'preco.taxa_maos_amigas',
            'escala.resumo',
            'datas.inicio',
            'datas.fim',
            'pagamento.metodo',
            'pagamento.vencimento',
        ];
        expect(validateRequiredPlaceholders(all)).toEqual([]);
    });

    it('retorna placeholders detectados no render', () => {
        const rendered = renderContract('<<a>> <<b>>', { a: 1, b: 2 });
        expect(rendered.placeholders).toEqual(['a', 'b']);
    });
});

describe('contract template engine - extended edge cases', () => {
    describe('extractPlaceholders', () => {
        it('returns empty array when no placeholders found', () => {
            expect(extractPlaceholders('No placeholders here')).toEqual([]);
        });

        it('returns empty array for empty string', () => {
            expect(extractPlaceholders('')).toEqual([]);
        });

        it('handles placeholders with spaces around key', () => {
            const result = extractPlaceholders('<< paciente.nome >>');
            expect(result).toEqual(['paciente.nome']);
        });

        it('handles placeholders with underscores and dots', () => {
            const result = extractPlaceholders('<<preco.taxa_maos_amigas>> <<a.b_c.d>>');
            expect(result).toEqual(['a.b_c.d', 'preco.taxa_maos_amigas']);
        });

        it('ignores malformed placeholders (missing closing >>)', () => {
            const result = extractPlaceholders('<<paciente.nome text');
            expect(result).toEqual([]);
        });

        it('handles single-level keys (no dots)', () => {
            const result = extractPlaceholders('<<nome>>');
            expect(result).toEqual(['nome']);
        });

        it('handles deeply nested keys', () => {
            const result = extractPlaceholders('<<a.b.c.d.e>>');
            expect(result).toEqual(['a.b.c.d.e']);
        });
    });

    describe('renderContract edge cases', () => {
        it('renders boolean true as "true"', () => {
            const rendered = renderContract('Active: <<status>>', { status: true });
            expect(rendered.content).toBe('Active: true');
            expect(rendered.pending).toEqual([]);
        });

        it('renders boolean false as "false"', () => {
            const rendered = renderContract('Active: <<status>>', { status: false });
            expect(rendered.content).toBe('Active: false');
            expect(rendered.pending).toEqual([]);
        });

        it('renders number zero as "0" (not pending)', () => {
            const rendered = renderContract('Total: <<preco>>', { preco: 0 });
            expect(rendered.content).toBe('Total: 0');
            expect(rendered.pending).toEqual([]);
        });

        it('renders null as pending', () => {
            const rendered = renderContract('Name: <<nome>>', { nome: null });
            expect(rendered.content).toBe('Name: <<nome>>');
            expect(rendered.pending).toEqual(['nome']);
        });

        it('renders undefined path as pending', () => {
            const rendered = renderContract('<<a.b.c>>', { a: { b: {} } });
            expect(rendered.content).toBe('<<a.b.c>>');
            expect(rendered.pending).toEqual(['a.b.c']);
        });

        it('renders NaN number as empty string in content (not pending)', () => {
            // NaN passes the null/undefined/'' check in renderContract since NaN is a number.
            // stringifyValue returns '' for non-finite numbers.
            // The result is an empty string in content, but NOT marked as pending.
            const rendered = renderContract('<<val>>', { val: NaN });
            expect(rendered.content).toBe('');
            expect(rendered.pending).toEqual([]);
        });

        it('renders negative numbers correctly', () => {
            const rendered = renderContract('<<val>>', { val: -123.45 });
            expect(rendered.content).toBe('-123.45');
        });

        it('handles template with no placeholders', () => {
            const rendered = renderContract('Plain text document', { anything: 'ignored' });
            expect(rendered.content).toBe('Plain text document');
            expect(rendered.placeholders).toEqual([]);
            expect(rendered.pending).toEqual([]);
        });

        it('handles empty template', () => {
            const rendered = renderContract('', { anything: 'ignored' });
            expect(rendered.content).toBe('');
            expect(rendered.placeholders).toEqual([]);
        });

        it('renders array values as JSON', () => {
            const rendered = renderContract('<<items>>', { items: [1, 2, 3] });
            expect(rendered.content).toBe('[1,2,3]');
        });

        it('renders deeply nested data correctly', () => {
            const rendered = renderContract('<<a.b.c>>', {
                a: { b: { c: 'deep_value' } },
            });
            expect(rendered.content).toBe('deep_value');
            expect(rendered.pending).toEqual([]);
        });

        it('multiple occurrences of same placeholder resolve to same value', () => {
            const rendered = renderContract('<<nome>> and <<nome>>', {
                nome: 'Maria',
            });
            expect(rendered.content).toBe('Maria and Maria');
        });

        it('mixed resolved and pending placeholders', () => {
            const rendered = renderContract(
                '<<paciente.nome>> owes <<preco.total>> on <<datas.vencimento>>',
                {
                    paciente: { nome: 'Carlos' },
                    preco: { total: 500 },
                },
            );
            expect(rendered.content).toBe('Carlos owes 500 on <<datas.vencimento>>');
            expect(rendered.pending).toEqual(['datas.vencimento']);
        });
    });

    describe('validateRequiredPlaceholders', () => {
        it('returns all required when given empty array', () => {
            const missing = validateRequiredPlaceholders([]);
            expect(missing.length).toBe(12);
        });

        it('returns empty when all required plus extras are present', () => {
            const all = [
                'orcamento.id',
                'paciente.nome',
                'unidade.nome',
                'contrato.tipo',
                'preco.total',
                'preco.prestador',
                'preco.taxa_maos_amigas',
                'escala.resumo',
                'datas.inicio',
                'datas.fim',
                'pagamento.metodo',
                'pagamento.vencimento',
                'extra.field',
            ];
            expect(validateRequiredPlaceholders(all)).toEqual([]);
        });

        it('reports only the specific missing placeholders', () => {
            const partial = [
                'orcamento.id',
                'paciente.nome',
                'unidade.nome',
                'contrato.tipo',
                'preco.total',
                'preco.prestador',
                'preco.taxa_maos_amigas',
                'escala.resumo',
                'datas.inicio',
                'datas.fim',
            ];
            const missing = validateRequiredPlaceholders(partial);
            expect(missing).toEqual(['pagamento.metodo', 'pagamento.vencimento']);
        });
    });
});
