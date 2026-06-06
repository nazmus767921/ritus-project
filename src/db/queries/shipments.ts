import { eq, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { shipments, inventoryItems, transactions } from '../schema';
import type { ShipmentRecord, InventoryItemRecord } from '../types';

export interface ShipmentItemInput {
  id?: number;
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
  courierFee: number,
  deliveryDate: Date,
  items: ShipmentItemInput[]
): Promise<ShipmentRecord> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [insertedShipment] = await tx.insert(shipments).values({
      courierFee,
      deliveryDate
    }).returning();

    if (!insertedShipment) {
      throw new Error('Failed to insert shipment header.');
    }

    for (const item of items) {
      await tx.insert(inventoryItems).values({
        shipmentId: insertedShipment.id,
        brand: item.brand,
        quantity: item.quantity,
        wholesaleCost: item.wholesaleCost,
        trueCost: item.trueCost
      });
    }

    if (courierFee > 0) {
      const [feeTx] = await tx.insert(transactions).values({
        amount: courierFee,
        category: 'clothing_overhead',
        description: `Shipment #${insertedShipment.id} Courier Fee Overhead`,
        createdAt: deliveryDate,
        status: 'active'
      }).returning();

      // Store the courier transaction ID on the shipment
      await tx.update(shipments)
        .set({ courierTransactionId: feeTx.id })
        .where(eq(shipments.id, insertedShipment.id));
    }

    return insertedShipment;
  });
}

/**
 * Deletes a shipment and its associated courier fee transaction.
 * Uses the stored courierTransactionId instead of string matching.
 */
export async function deleteShipment(shipmentId: number): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId));

    if (shipment?.courierTransactionId) {
      await tx.delete(transactions).where(eq(transactions.id, shipment.courierTransactionId));
    }

    await tx.delete(shipments).where(eq(shipments.id, shipmentId));
  });
}

/**
 * Updates an existing shipment, adjusts inventory items, and updates the courier fee transaction.
 */
export async function updateShipment(
  shipmentId: number,
  courierFee: number,
  deliveryDate: Date,
  items: ShipmentItemInput[]
): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    await tx.update(shipments)
      .set({ courierFee, deliveryDate })
      .where(eq(shipments.id, shipmentId));

    const existingItems = await tx.select().from(inventoryItems).where(eq(inventoryItems.shipmentId, shipmentId));
    const existingIds: number[] = existingItems.map((item: InventoryItemRecord) => item.id);

    const inputIds: number[] = items.map(i => i.id).filter((id): id is number => id !== undefined);
    const toDelete = existingIds.filter((id: number) => !inputIds.includes(id));
    for (const delId of toDelete) {
      await tx.delete(inventoryItems).where(eq(inventoryItems.id, delId));
    }

    for (const item of items) {
      if (item.id) {
        await tx.update(inventoryItems)
          .set({
            brand: item.brand,
            quantity: item.quantity,
            wholesaleCost: item.wholesaleCost,
            trueCost: item.trueCost
          })
          .where(eq(inventoryItems.id, item.id));
      } else {
        await tx.insert(inventoryItems).values({
          shipmentId,
          brand: item.brand,
          quantity: item.quantity,
          wholesaleCost: item.wholesaleCost,
          trueCost: item.trueCost
        });
      }
    }

    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId));

    if (courierFee > 0) {
      if (shipment?.courierTransactionId) {
        await tx.update(transactions)
          .set({ amount: courierFee, createdAt: deliveryDate })
          .where(eq(transactions.id, shipment.courierTransactionId));
      } else {
        const [feeTx] = await tx.insert(transactions).values({
          amount: courierFee,
          category: 'clothing_overhead',
          description: `Shipment #${shipmentId} Courier Fee Overhead`,
          createdAt: deliveryDate,
          status: 'active'
        }).returning();

        await tx.update(shipments)
          .set({ courierTransactionId: feeTx.id })
          .where(eq(shipments.id, shipmentId));
      }
    } else if (shipment?.courierTransactionId) {
      await tx.delete(transactions).where(eq(transactions.id, shipment.courierTransactionId));
      await tx.update(shipments)
        .set({ courierTransactionId: null })
        .where(eq(shipments.id, shipmentId));
    }
  });
}

/**
 * Retrieves all shipments, ordered by ID desc.
 */
export async function getShipments(): Promise<ShipmentRecord[]> {
  const db = getDb();
  return await db.select().from(shipments).orderBy(desc(shipments.id));
}
