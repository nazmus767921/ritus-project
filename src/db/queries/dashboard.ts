import { getDb } from '../client';
import { transactions } from '../schema';

/**
 * Calculates and returns the dynamically aggregated financial metrics from the transactions table.
 */
export async function fetchAggregatedMetrics() {
  const db = getDb();
  const allTx = await db.select().from(transactions);
  
  let tailoringIncome = 0;
  let tailoringExpense = 0;
  let clothingIncome = 0;
  let clothingOverhead = 0;
  let personalExpense = 0;

  for (const t of allTx) {
    if (t.status === 'refunded') continue;
    if (t.category === 'tailoring_income') tailoringIncome += t.amount;
    if (t.category === 'tailoring_expense') tailoringExpense += t.amount;
    if (t.category === 'clothing_income') clothingIncome += t.amount;
    if (t.category === 'clothing_overhead') clothingOverhead += t.amount;
    if (t.category === 'personal_expense') personalExpense += t.amount;
  }

  const tailoringNet = tailoringIncome - tailoringExpense;
  const clothingNet = clothingIncome - clothingOverhead;
  const totalBusinessProfit = tailoringNet + clothingNet;
  const safetyPocket = totalBusinessProfit - personalExpense;

  return {
    tailoringNet,
    clothingNet,
    totalBusinessProfit,
    safetyPocket
  };
}
