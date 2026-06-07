import { desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { inventoryItems, transactions } from '../schema';
import { roundPrice, formatCurrency } from '../../lib/math/rounding';
import type { InventoryItemRecord } from '../types';

/**
 * Retrieves all inventory items, ordered by ID desc.
 */
export async function getInventoryItems(): Promise<InventoryItemRecord[]> {
  const db = getDb();
  return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.id));
}

/**
 * Executes a product sale transaction: verifies stock, decrements quantity, and logs clothing income.
 */
export async function executeProductSale(itemId: number, retailPrice: number, note?: string, customerName?: string, quantity: number = 1) {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
    if (!item) {
      throw new Error("Product item not found.");
    }
    if (item.quantity < quantity) {
      throw new Error(`Insufficient stock: ${item.quantity} available, ${quantity} requested.`);
    }

    await tx.update(inventoryItems)
      .set({ quantity: item.quantity - quantity })
      .where(eq(inventoryItems.id, itemId));

    const description = `Sale: ${item.brand} (Cost: ${formatCurrency(item.trueCost)})`;

    await tx.insert(transactions).values({
      amount: retailPrice,
      category: 'clothing_income',
      description,
      customerName: customerName || null,
      notes: note || null,
      createdAt: new Date(),
      status: 'active',
      inventoryItemId: itemId,
      quantity
    });
  });
}
