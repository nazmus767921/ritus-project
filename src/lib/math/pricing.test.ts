import { describe, expect, it } from 'vitest';
import { calculatePreferredPrice, calculateProfitMargin } from './pricing';

describe('calculatePreferredPrice', () => {
  it('uses markup over true cost for preferred sell price', () => {
    const result = calculatePreferredPrice(62000, 0.50);

    expect(result).toBe(93000);
  });

  it('floors negative markup at cost price', () => {
    const result = calculatePreferredPrice(62000, -0.25);

    expect(result).toBe(62000);
  });
});

describe('calculateProfitMargin', () => {
  it('calculates profit as a percentage of revenue', () => {
    const result = calculateProfitMargin(93000, 62000);

    expect(result).toBeCloseTo(0.3333, 4);
  });

  it('returns 0 when revenue is absent', () => {
    const result = calculateProfitMargin(0, 62000);

    expect(result).toBe(0);
  });
});
