import { roundPrice } from './rounding';

export interface InputItem {
  quantity: number;
  wholesaleCost: number; // Scaled by 100 (representing Poisha)
}

/**
 * Calculates the true cost of items in a shipment by distributing the flat courier fee
 * proportionally (Option A: flat fee divided by total unit count).
 * All monetary values (courierFee, wholesaleCost, and returned true costs) are scaled integers (Taka * 100).
 * 
 * @param courierFee - The flat courier fee (Taka * 100)
 * @param items - The list of items in the shipment with quantity and wholesale cost
 * @returns Array of adjusted true costs per item matching the input order
 */
export function calculateOptionA(courierFee: number, items: InputItem[]): number[] {
  if (items.length === 0) return [];
  
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalUnits <= 0) {
    throw new Error('Total units in a shipment must be greater than zero.');
  }

  // Calculate per-unit fee in scaled integer, rounded to the nearest integer
  const perUnitFee = Math.round(courierFee / totalUnits);

  return items.map(item => {
    const raw = item.wholesaleCost + perUnitFee;
    if (raw <= 0) return 0;
    return roundPrice(raw);
  });
}
