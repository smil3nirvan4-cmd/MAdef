import { describe, it, expect } from 'vitest';
import { buildContratoTemplate, ContratoData } from '../contrato-template';

function baseData(overrides: Partial<ContratoData> = {}): ContratoData {
  return {
    orcamentoId: 'ORC-001',
    pacienteNome: 'Maria Silva',
    pacienteTelefone: '11999990000',
    ...overrides,
  };
}

describe('buildContratoTemplate', () => {
  it('generates fileName containing the orcamentoId', () => {
    const result = buildContratoTemplate(baseData({ orcamentoId: 'ORC-42' }));
    expect(result.fileName).toBe('Contrato_MaosAmigas_ORC-42.pdf');
  });

  it('includes paciente nome in the output lines', () => {
    const result = buildContratoTemplate(baseData({ pacienteNome: 'João Souza' }));
    const text = result.lines.join('\n');
    expect(text).toContain('Nome: João Souza');
  });

  it('shows "A combinar" when valorFinal is null', () => {
    const result = buildContratoTemplate(baseData({ valorFinal: null }));
    const text = result.lines.join('\n');
    expect(text).toContain('A combinar');
  });

  it('formats BRL value when valorFinal is provided', () => {
    const result = buildContratoTemplate(baseData({ valorFinal: 4500 }));
    const text = result.lines.join('\n');
    // Intl pt-BR formats 4500 as R$ 4.500,00
    expect(text).toContain('R$');
    expect(text).toContain('4.500,00');
  });

  it('shows location when cidade and bairro are provided', () => {
    const result = buildContratoTemplate(
      baseData({ pacienteCidade: 'São Paulo', pacienteBairro: 'Moema' }),
    );
    const text = result.lines.join('\n');
    expect(text).toContain('Local: São Paulo - Moema');
  });

  it('shows "Não informado" when location fields are missing', () => {
    const result = buildContratoTemplate(
      baseData({ pacienteCidade: null, pacienteBairro: null }),
    );
    const text = result.lines.join('\n');
    expect(text).toContain('Local: Não informado');
  });
});
