/**
 * Calculates a preferred retail price from true cost and markup.
 * All monetary amounts are integers (Poisha). Markup is a decimal,
 * e.g. 0.50 means 50% over cost.
 */
export function calculatePreferredPrice(trueCost: number, markup: number): number {
  return Math.round(trueCost * (1 + Math.max(0, markup)));
}

export function calculateProfitMargin(revenue: number, cost: number): number {
  return revenue > 0 ? (revenue - cost) / revenue : 0;
}
