import { describe, it, expect } from 'vitest';
import { calculateOptionA } from './allocator';

describe('calculateOptionA', () => {
  it('should return empty array for empty inputs', () => {
    expect(calculateOptionA(50000, [])).toEqual([]);
  });

  it('should handle correct allocation math for a single-item shipment', () => {
    // Courier fee: 150.00 Taka (15000 Poisha)
    // Item: 10 units, wholesale cost 120.00 Taka (12000 Poisha) each
    const result = calculateOptionA(15000, [{ quantity: 10, wholesaleCost: 12000 }]);
    // 15000 / 10 = 1500 per unit fee. True cost: 12000 + 1500 = 13500 (135.00 Taka)
    expect(result).toEqual([13500]);
  });

  it('should handle correct allocation math for multi-item lists', () => {
    // Courier fee: 300.00 Taka (30000 Poisha)
    // Item 1: 10 units, wholesale cost 100.00 Taka (10000 Poisha)
    // Item 2: 20 units, wholesale cost 150.00 Taka (15000 Poisha)
    // Total units = 30. Courier fee per unit = 30000 / 30 = 1000 Poisha
    const result = calculateOptionA(30000, [
      { quantity: 10, wholesaleCost: 10000 },
      { quantity: 20, wholesaleCost: 15000 }
    ]);
    expect(result).toEqual([11000, 16000]);
  });

  it('should handle rounding behavior properly', () => {
    // Courier fee: 100.00 Taka (10000 Poisha)
    // Item 1: 3 units, wholesale cost 10.00 Taka (1000 Poisha)
    // Total units = 3. Courier fee per unit = 10000 / 3 = 3333.333... rounded to 3333 Poisha.
    // True cost = 1000 + 3333 = 4333 Poisha.
    const result = calculateOptionA(10000, [{ quantity: 3, wholesaleCost: 1000 }]);
    expect(result).toEqual([4333]);
  });

  it('should throw error when total units is zero', () => {
    expect(() => calculateOptionA(10000, [{ quantity: 0, wholesaleCost: 1000 }])).toThrow(
      'Total units in a shipment must be greater than zero.'
    );
  });
});
