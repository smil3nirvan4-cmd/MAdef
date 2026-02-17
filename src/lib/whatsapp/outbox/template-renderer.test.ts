import { describe, expect, it } from 'vitest';
import { listTemplateVariables, renderTemplateContent } from '@/lib/whatsapp/outbox/template-renderer';

describe('template-renderer', () => {
    it('lists placeholders from content', () => {
        const variables = listTemplateVariables('Ola {{nome}}, valor {{valor}} e {{nome}} novamente.');
        expect(variables).toEqual(['nome', 'valor']);
    });

    it('renders placeholders with provided variables', () => {
        const rendered = renderTemplateContent('Ola {{nome}}, total {{valor}}', {
            nome: 'Ana',
            valor: 1200,
        });

        expect(rendered.rendered).toBe('Ola Ana, total 1200');
        expect(rendered.missingVariables).toEqual([]);
        expect(rendered.variablesUsed).toEqual(['nome', 'valor']);
    });

    it('reports missing variables', () => {
        const rendered = renderTemplateContent('Ola {{nome}}, contrato {{linkContrato}}', {
            nome: 'Ana',
        });

        expect(rendered.rendered).toBe('Ola Ana, contrato {{linkContrato}}');
        expect(rendered.missingVariables).toEqual(['linkContrato']);
    });
});

