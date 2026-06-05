import { desc } from 'drizzle-orm';
import { getDb } from '../client';
import { inventoryItems } from '../schema';

/**
 * Retrieves all inventory items, ordered by ID desc.
 */
export async function getInventoryItems() {
  const db = getDb();
  return await db.select().from(inventoryItems).orderBy(desc(inventoryItems.id));
}
