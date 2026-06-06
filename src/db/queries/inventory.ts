import { desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { inventoryItems, transactions } from '../schema';

/**
 * Retrieves all inventory items, ordered by ID desc.
 */
export async function getInventoryItems() {
  const db = getDb();
  return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.id));
}

/**
 * Executes a product sale transaction: verifies stock, decrements quantity, and logs clothing income.
 */
export async function executeProductSale(itemId: number, retailPrice: number) {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    // 1. Fetch current stock state
    const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
    if (!item) {
      throw new Error("Product item not found.");
    }
    if (item.quantity <= 0) {
      throw new Error("Item is out of stock. Cannot execute sale.");
    }

    // 2. Decrement remaining quantity by 1
    await tx.update(inventoryItems)
      .set({ quantity: item.quantity - 1 })
      .where(eq(inventoryItems.id, itemId));

    // 3. Log sales revenue transaction with linked inventoryItemId
    await tx.insert(transactions).values({
      amount: retailPrice,
      category: 'clothing_income',
      description: `Sale: ${item.brand} (Cost: ৳${(item.trueCost / 100).toFixed(2)})`,
      createdAt: new Date(),
      status: 'active',
      inventoryItemId: itemId
    });
  });
}
