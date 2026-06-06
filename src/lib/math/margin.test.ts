import { describe, it, expect } from 'vitest';
import { calculateDynamicMargin } from './margin';

describe('calculateDynamicMargin', () => {
  it('should return target margin if there is no inventory in stock', () => {
    const result = calculateDynamicMargin(0.20, 10000, 12000, 0);
    expect(result).toBe(0.20);
  });

  it('should calculate correct dynamic margin to meet overall target', () => {
    // Target margin: 20% (0.20)
    // Sold: Cost = 10000 Poisha (100.00 Taka), Sold for = 11000 Poisha (110.00 Taka) (Margin: ~9.1%)
    // Inventory Cost: 10000 Poisha (100.00 Taka)
    // Total Cost = 20000. Target overall revenue = 20000 / 0.8 = 25000.
    // Remaining Revenue needed = 25000 - 11000 = 14000.
    // Dynamic margin on inventory: (14000 - 10000) / 14000 = 4000 / 14000 = 0.285714... (28.57%)
    const result = calculateDynamicMargin(0.20, 10000, 11000, 10000);
    expect(result).toBeCloseTo(0.2857, 4);
  });

  it('should floor to 0% if actual sales have already exceeded overall target', () => {
    // Target margin: 20%
    // Sold: Cost = 10000, Sold for = 30000 (Margin: 66.6%)
    // Inventory Cost: 10000.
    // Total Cost = 20000. Target overall revenue = 25000.
    // Remaining Revenue needed = 25000 - 30000 = -5000.
    // Since required remaining revenue is <= cost, it should floor at 0.0 (sell at cost).
    const result = calculateDynamicMargin(0.20, 10000, 30000, 10000);
    expect(result).toBe(0.0);
  });

  it('should cap at 90% if we are too far behind and need an extreme margin', () => {
    // Target margin: 50%
    // Sold: Cost = 10000, Sold for = 1000 (sold at massive loss)
    // Inventory Cost: 1000.
    // Total Cost = 11000. Target overall revenue = 22000.
    // Remaining Revenue needed = 22000 - 1000 = 21000.
    // Dynamic margin on remaining: (21000 - 1000) / 21000 = 20/21 = 95.2%
    // Capped at 90%
    const result = calculateDynamicMargin(0.50, 10000, 1000, 1000);
    expect(result).toBe(0.90);
  });

  it('should handle divisor safety when target margin is >= 100%', () => {
    const result = calculateDynamicMargin(1.0, 1000, 1000, 1000);
    expect(result).toBe(0.90);
  });
});
