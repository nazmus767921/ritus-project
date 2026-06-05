import { getDb } from '../client';
import { shipments, inventoryItems, transactions } from '../schema';

export interface ShipmentItemInput {
  brand: string;
  quantity: number;
  wholesaleCost: number; // Scaled integer (Poisha)
  trueCost: number;      // Scaled integer (Poisha)
}

/**
 * Creates a shipment and its corresponding inventory items, and logs the courier fee overhead.
 * All writes occur inside a single SQLite transaction to prevent orphan records.
 */
export async function createShipmentTransaction(
  courierFee: number, // Scaled integer (Poisha)
  deliveryDate: Date,
  items: ShipmentItemInput[]
) {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    // 1. Insert Shipment Header
    const [insertedShipment] = await tx.insert(shipments).values({
      courierFee,
      deliveryDate
    }).returning();

    if (!insertedShipment) {
      throw new Error('Failed to insert shipment header.');
    }

    // 2. Insert Batch Inventory Items
    for (const item of items) {
      await tx.insert(inventoryItems).values({
        shipmentId: insertedShipment.id,
        brand: item.brand,
        quantity: item.quantity,
        wholesaleCost: item.wholesaleCost,
        trueCost: item.trueCost
      });
    }

    // 3. Log Courier Fee as Business Overhead Transaction
    if (courierFee > 0) {
      await tx.insert(transactions).values({
        amount: courierFee,
        category: 'clothing_overhead',
        description: `Shipment #${insertedShipment.id} Courier Fee Overhead`,
        createdAt: deliveryDate
      });
    }

    return insertedShipment;
  });
}
