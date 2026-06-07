import { describe, expect, it } from 'vitest';
import { formatCurrency, roundStock, roundPrice } from './rounding';

describe('formatCurrency', () => {
  it('formats whole Taka without decimals', () => {
    expect(formatCurrency(10000)).toBe('৳100');
    expect(formatCurrency(0)).toBe('৳0');
    expect(formatCurrency(5000)).toBe('৳50');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50000)).toBe('৳-500');
  });

  it('rounds fractional Poisha to nearest Taka', () => {
    expect(formatCurrency(10050)).toBe('৳101');
    expect(formatCurrency(10049)).toBe('৳100');
  });
});

describe('roundStock', () => {
  it('rounds to nearest integer, throws on negative', () => {
    expect(roundStock(4.7)).toBe(5);
    expect(() => roundStock(-5)).toThrow('Quantity cannot be negative.');
  });
});

describe('roundPrice', () => {
  it('rounds to nearest 10 Taka, min 100 Poisha', () => {
    expect(roundPrice(62000)).toBe(62000);
    expect(roundPrice(61500)).toBe(62000);
    expect(roundPrice(50)).toBe(100);
  });
});
