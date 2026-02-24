import { describe, it, expect } from 'vitest';
import { buildPropostaTemplate, PropostaData } from '../proposta-template';

function baseData(overrides: Partial<PropostaData> = {}): PropostaData {
  return {
    orcamentoId: 'ORC-100',
    pacienteNome: 'Ana Costa',
    pacienteTelefone: '21988880000',
    ...overrides,
  };
}

describe('buildPropostaTemplate', () => {
  it('generates fileName containing the orcamentoId', () => {
    const result = buildPropostaTemplate(baseData({ orcamentoId: 'ORC-77' }));
    expect(result.fileName).toBe('Proposta_MaosAmigas_ORC-77.pdf');
  });

  it('includes paciente data in the output lines', () => {
    const result = buildPropostaTemplate(
      baseData({ pacienteNome: 'Carlos Lima', pacienteTelefone: '31977770000' }),
    );
    const text = result.lines.join('\n');
    expect(text).toContain('Nome: Carlos Lima');
    expect(text).toContain('Telefone: 31977770000');
  });

  it('shows "A combinar" when valorFinal is null', () => {
    const result = buildPropostaTemplate(baseData({ valorFinal: null }));
    const text = result.lines.join('\n');
    expect(text).toContain('A combinar');
  });

  it('includes cenario selecionado in the output', () => {
    const result = buildPropostaTemplate(
      baseData({ cenarioSelecionado: '12h diurno' }),
    );
    const text = result.lines.join('\n');
    expect(text).toContain('Cenário recomendado: 12h diurno');
  });

  it('includes observacoes in the output', () => {
    const result = buildPropostaTemplate(
      baseData({ observacoes: 'Paciente requer cadeira de rodas.' }),
    );
    const text = result.lines.join('\n');
    expect(text).toContain('Paciente requer cadeira de rodas.');
  });

  it('shows default text when observacoes is not provided', () => {
    const result = buildPropostaTemplate(baseData({ observacoes: null }));
    const text = result.lines.join('\n');
    expect(text).toContain('Sem observações adicionais.');
  });
});
