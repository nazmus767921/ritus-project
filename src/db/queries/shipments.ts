import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { shipments, inventoryItems, transactions } from '../schema';
import { roundStock } from '../../lib/math/rounding';
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
      const qty = roundStock(item.quantity);
      if (qty <= 0) {
        throw new Error(`Quantity must be greater than 0 for item "${item.brand}".`);
      }
      await tx.insert(inventoryItems).values({
        shipmentId: insertedShipment.id,
        brand: item.brand,
        quantity: qty,
        initialQuantity: qty,
        wholesaleCost: Math.round(item.wholesaleCost),
        trueCost: Math.round(item.trueCost)
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
 * Blocks deletion if any inventory items have linked clothing sales.
 */
export async function deleteShipment(shipmentId: number): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId));

    const items = await tx.select().from(inventoryItems).where(eq(inventoryItems.shipmentId, shipmentId));
    for (const item of items) {
      const [sale] = await tx.select().from(transactions)
        .where(and(
          eq(transactions.inventoryItemId, item.id),
          eq(transactions.category, 'clothing_income')
        ))
        .limit(1);
      if (sale) {
        throw new Error(
          `Cannot delete shipment: item "${item.brand}" (ID ${item.id}) has linked sales. Remove sales first.`
        );
      }
    }

    if (shipment?.courierTransactionId) {
      await tx.delete(transactions).where(eq(transactions.id, shipment.courierTransactionId));
    }

    // CASCADE delete handles inventory items via FK constraint
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
        const [existing] = await tx.select({
          initialQuantity: inventoryItems.initialQuantity,
          quantity: inventoryItems.quantity,
          wholesaleCost: inventoryItems.wholesaleCost,
          trueCost: inventoryItems.trueCost
        })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, item.id));

        if (!existing) throw new Error(`Inventory item ${item.id} not found.`);

        // C3: Disallow increasing quantity on existing items
        if (roundStock(item.quantity) > existing.quantity) {
          throw new Error(
            `Cannot increase quantity on existing item. Current remaining: ${existing.quantity}. ` +
            `Add a new shipment for additional stock.`
          );
        }

        // C2: Disallow trueCost/wholesaleCost changes if item has linked sales
        const [linkedSale] = await tx.select().from(transactions)
          .where(and(
            eq(transactions.inventoryItemId, item.id),
            eq(transactions.category, 'clothing_income')
          ))
          .limit(1);
        if (linkedSale) {
          if (Math.round(item.wholesaleCost) !== existing.wholesaleCost ||
              Math.round(item.trueCost) !== existing.trueCost) {
            throw new Error(
              `Cannot change costs on "${item.brand}" (ID ${item.id}): linked sales exist. ` +
              `Create a new shipment for updated pricing.`
            );
          }
        }

        // L4: Validate wholesaleCost ≤ trueCost
        const newWholesaleCost = Math.round(item.wholesaleCost);
        const newTrueCost = Math.round(item.trueCost);
        if (newWholesaleCost > newTrueCost) {
          throw new Error(
            `Wholesale cost (${newWholesaleCost}) exceeds true cost (${newTrueCost}) for "${item.brand}".`
          );
        }

        await tx.update(inventoryItems)
          .set({
            brand: item.brand,
            quantity: roundStock(item.quantity),
            initialQuantity: existing.initialQuantity,
            wholesaleCost: newWholesaleCost,
            trueCost: newTrueCost
          })
          .where(eq(inventoryItems.id, item.id));
      } else {
        const qty = roundStock(item.quantity);
        if (qty <= 0) {
          throw new Error(`Quantity must be greater than 0 for item "${item.brand}".`);
        }
        const newWholesaleCost = Math.round(item.wholesaleCost);
        const newTrueCost = Math.round(item.trueCost);
        if (newWholesaleCost > newTrueCost) {
          throw new Error(
            `Wholesale cost (${newWholesaleCost}) exceeds true cost (${newTrueCost}) for "${item.brand}".`
          );
        }
        await tx.insert(inventoryItems).values({
          shipmentId,
          brand: item.brand,
          quantity: qty,
          initialQuantity: qty,
          wholesaleCost: newWholesaleCost,
          trueCost: newTrueCost
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
