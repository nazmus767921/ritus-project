import { desc, eq, and, asc, gt } from 'drizzle-orm';
import { getDb } from '../client';
import { inventoryItems, transactions } from '../schema';
import { formatCurrency } from '../../lib/math/rounding';
import type { InventoryItemRecord } from '../types';

/**
 * Finds the best FIFO batch for a brand and quantity.
 * Returns the oldest batch with sufficient stock, or the newest batch that can fulfill it.
 */
export async function findFifoBatch(brand: string, quantity: number): Promise<InventoryItemRecord | null> {
  const db = getDb();
  const batches = await db.select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.brand, brand),
        gt(inventoryItems.quantity, 0)
      )
    )
    .orderBy(asc(inventoryItems.id));

  if (batches.length === 0) return null;

  const sufficient = batches.find((b: InventoryItemRecord) => b.quantity >= quantity);
  if (sufficient) return sufficient;

  const newest = batches[batches.length - 1];
  const totalAvailable = batches.reduce((sum: number, b: InventoryItemRecord) => sum + b.quantity, 0);
  if (totalAvailable >= quantity) return newest;

  return null;
}

/**
 * Creates a COGS transaction for a clothing sale.
 */
async function createCogsTransaction(tx: any, item: InventoryItemRecord, quantity: number): Promise<void> {
  const cogsAmount = item.trueCost * quantity;
  await tx.insert(transactions).values({
    amount: cogsAmount,
    category: 'cost_of_goods_sold',
    description: `COGS: ${item.brand} (Batch #${item.id})`,
    createdAt: new Date(),
    status: 'active',
    inventoryItemId: item.id,
    quantity
  });
}

/**
 * Executes a product sale transaction: resolves FIFO batch, verifies stock, decrements quantity,
 * logs clothing income, and records COGS.
 */
export async function executeProductSale(
  itemId: number,
  retailPrice: number,
  note?: string,
  customerName?: string,
  quantity: number = 1
) {
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

    const [incomeTx] = await tx.insert(transactions).values({
      amount: retailPrice,
      category: 'clothing_income',
      description,
      customerName: customerName || null,
      notes: note || null,
      createdAt: new Date(),
      status: 'active',
      inventoryItemId: itemId,
      quantity
    }).returning();

    if (incomeTx) {
      await createCogsTransaction(tx, item, quantity);
    }
  });
}

/**
 * Retrieves all inventory items, ordered by ID desc.
 */
export async function getInventoryItems(): Promise<InventoryItemRecord[]> {
  const db = getDb();
  return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.id));
}
