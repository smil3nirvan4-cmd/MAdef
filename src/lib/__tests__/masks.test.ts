import { describe, it, expect } from 'vitest';
import {
  maskCPF,
  validateCPF,
  maskPhone,
  maskCEP,
  maskCurrency,
  maskWeight,
  maskHeight,
  maskDigitsOnly,
  unmask,
} from '../masks';

describe('maskCPF', () => {
  it('formats partial input (3 digits)', () => {
    expect(maskCPF('529')).toBe('529');
  });

  it('formats partial input (6 digits)', () => {
    expect(maskCPF('529982')).toBe('529.982');
  });

  it('formats full 11-digit CPF', () => {
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
  });
});

describe('validateCPF', () => {
  it('returns true for a valid CPF', () => {
    expect(validateCPF('52998224725')).toBe(true);
  });

  it('returns false for an invalid CPF', () => {
    expect(validateCPF('12345678901')).toBe(false);
  });

  it('rejects all-same-digit CPF', () => {
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
  });
});

describe('maskPhone', () => {
  it('formats an 11-digit mobile number', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('strips leading country code 55', () => {
    expect(maskPhone('5511987654321')).toBe('(11) 98765-4321');
  });

  it('formats an 8-digit landline with area code (10 digits)', () => {
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
  });
});

describe('maskCEP', () => {
  it('returns partial input unchanged when 5 digits or fewer', () => {
    expect(maskCEP('0130')).toBe('0130');
  });

  it('formats a full 8-digit CEP', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
  });
});

describe('maskCurrency', () => {
  it('returns empty string for empty input', () => {
    expect(maskCurrency('')).toBe('');
  });

  it('formats digits as BRL currency', () => {
    const result = maskCurrency('1050');
    // Locale may use non-breaking space; normalise for assertion
    const normalised = result.replace(/\s/g, ' ');
    expect(normalised).toContain('R$');
    expect(normalised).toContain('10,50');
  });
});

describe('maskWeight', () => {
  it('formats weight with comma decimal', () => {
    expect(maskWeight('75,5')).toBe('75,5');
  });

  it('truncates integer part to 3 digits', () => {
    expect(maskWeight('1234')).toBe('123');
  });
});

describe('maskHeight', () => {
  it('formats height with comma decimal', () => {
    expect(maskHeight('1,75')).toBe('1,75');
  });

  it('truncates integer part to 1 digit', () => {
    expect(maskHeight('22,5')).toBe('2,5');
  });
});

describe('maskDigitsOnly', () => {
  it('strips non-digit characters', () => {
    expect(maskDigitsOnly('abc123def456')).toBe('123456');
  });

  it('respects maxLength parameter', () => {
    expect(maskDigitsOnly('1234567890', 5)).toBe('12345');
  });
});

describe('unmask', () => {
  it('strips formatting from a masked CPF', () => {
    expect(unmask('529.982.247-25')).toBe('52998224725');
  });

  it('strips formatting from a masked phone', () => {
    expect(unmask('(11) 98765-4321')).toBe('11987654321');
  });
});
