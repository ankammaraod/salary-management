import { describe, it, expect } from 'vitest';
import { getCurrencySymbol } from '../currency';

describe('getCurrencySymbol', () => {
  it.each([
    ['USA', '$'],
    ['United Kingdom', '£'],
    ['Germany', '€'],
    ['France', '€'],
    ['India', '₹'],
    ['Japan', '¥'],
    ['Brazil', 'R$'],
    ['Australia', 'A$'],
  ])('returns %s symbol for %s', (country, symbol) => {
    expect(getCurrencySymbol(country)).toBe(symbol);
  });

  it('returns empty string for unknown country', () => {
    expect(getCurrencySymbol('Unknown')).toBe('');
  });
});
