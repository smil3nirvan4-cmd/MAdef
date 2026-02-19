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
