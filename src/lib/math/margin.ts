/**
 * Calculates the dynamic profit margin percentage to meet the overall target.
 * All monetary amounts are integers (Poisha).
 * Target margin is a decimal (e.g. 0.20 for 20%).
 */
export function calculateDynamicMargin(
  targetMargin: number,
  costSold: number,
  revenueSold: number,
  costInventory: number
): number {
  if (costInventory <= 0) {
    return targetMargin; // Default to target margin if nothing in stock
  }

  // Total Cost of goods (both sold and remaining in stock)
  const totalCost = costSold + costInventory;
  
  // Guard against target margin >= 100%
  const divisor = 1 - targetMargin;
  if (divisor <= 0) {
    return 0.90; // Cap at 90%
  }

  // Required Total Revenue to achieve Target Margin on Total Cost
  const requiredTotalRevenue = totalCost / divisor;
  
  // Remaining Revenue required from selling the items in stock
  const requiredRemainingRevenue = requiredTotalRevenue - revenueSold;

  if (requiredRemainingRevenue <= 0 || requiredRemainingRevenue <= costInventory) {
    return 0.0; // Floored at 0% (sell at cost if already exceeded target or target is met)
  }

  // Dynamic margin = (Remaining Revenue - Cost Inventory) / Remaining Revenue
  const dynamicMargin = 1 - (costInventory / requiredRemainingRevenue);

  // Floor at 0.0 (0%) and cap at 0.90 (90%) to prevent negative or infinite pricing suggestions
  return Math.max(0.0, Math.min(0.90, dynamicMargin));
}
