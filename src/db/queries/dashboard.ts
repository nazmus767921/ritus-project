import { sql, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, inventoryItems } from '../schema';
import type { DashboardMetrics } from '../types';

/**
 * Calculates and returns the dynamically aggregated financial metrics from the transactions table.
 * Uses SQL aggregate functions for efficient computation.
 */
export async function fetchAggregatedMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  const rows = await db.select({
    category: transactions.category,
    total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`
  })
    .from(transactions)
    .where(eq(transactions.status, 'active'))
    .groupBy(transactions.category);

  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.category] = Number(row.total);
  }

  const tailoringIncome = totals['tailoring_income'] || 0;
  const tailoringExpense = totals['tailoring_expense'] || 0;
  const clothingIncome = totals['clothing_income'] || 0;
  const clothingOverhead = totals['clothing_overhead'] || 0;
  const clothingCogs = totals['cost_of_goods_sold'] || 0;
  const supplierReturn = totals['supplier_return'] || 0;
  const personalExpense = totals['personal_expense'] || 0;

  const tailoringNet = tailoringIncome - tailoringExpense;
  // supplier_return is stored as negative (credit), so subtracting gives the positive credit adjustment
  const clothingNet = clothingIncome - clothingCogs - clothingOverhead - supplierReturn;
  const totalBusinessProfit = tailoringNet + clothingNet;
  const safetyPocket = totalBusinessProfit - personalExpense;

  // Inventory metrics
  const allItems = await db.select().from(inventoryItems) as { initialQuantity: number; quantity: number }[];
  const totalAvailableStock = allItems.reduce((sum, item) => sum + item.initialQuantity, 0);
  const totalRemainingStock = allItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSoldQuantity = totalAvailableStock - totalRemainingStock;

  return {
    tailoringNet,
    clothingNet,
    totalBusinessProfit,
    safetyPocket,
    totalAvailableStock,
    totalSoldQuantity,
    totalRemainingStock
  };
}
