import { desc } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions } from '../schema';

export async function insertTransaction(data: {
  amount: number;
  category: 'personal_expense' | 'tailoring_expense' | 'clothing_overhead' | 'tailoring_income' | 'clothing_income';
  description: string;
  createdAt: Date;
}) {
  const db = getDb();
  return await db.insert(transactions).values(data).returning();
}

export async function getTransactions() {
  const db = getDb();
  return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
}
