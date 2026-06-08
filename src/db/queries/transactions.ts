import { desc, eq, and } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, inventoryItems } from '../schema';
import { findFifoBatch } from './inventory';
import type { TransactionCategory, TransactionRecord } from '../types';

/**
 * Creates a COGS transaction for a clothing sale.
 */
async function createCogsTransaction(tx: any, item: { id: number; brand: string; trueCost: number }, quantity: number): Promise<void> {
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

export async function insertTransaction(data: {
  amount: number;
  category: TransactionCategory;
  description: string;
  customerName?: string | null;
  notes?: string | null;
  createdAt: Date;
  inventoryItemId?: number | null;
  quantity?: number;
  brand?: string;
}): Promise<TransactionRecord> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const qty = data.quantity ?? 1;
    let resolvedItemId = data.inventoryItemId || null;

    if (data.category === 'clothing_income') {
      if (!resolvedItemId && data.brand) {
        const fifoItem = await findFifoBatch(data.brand, qty);
        if (!fifoItem) {
          const allItems = await tx.select()
            .from(inventoryItems)
            .where(eq(inventoryItems.brand, data.brand));
          const totalAvailable = allItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
          if (totalAvailable === 0) {
            throw new Error(`Out of stock: "${data.brand}".`);
          }
          throw new Error(`Only ${totalAvailable} units available across all batches for "${data.brand}".`);
        }
        resolvedItemId = fifoItem.id;
      }

      if (!resolvedItemId) {
        throw new Error('Please select a stock item or provide a brand for clothing sales.');
      }

      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, resolvedItemId));
      if (!item) {
        throw new Error("Linked product item not found.");
      }
      if (item.quantity < qty) {
        throw new Error(`Insufficient stock: ${item.quantity} available, ${qty} requested.`);
      }

      await tx.update(inventoryItems)
        .set({ quantity: item.quantity - qty })
        .where(eq(inventoryItems.id, resolvedItemId));

      data.inventoryItemId = resolvedItemId;
    }

    const [newTx] = await tx.insert(transactions).values({
      amount: data.amount,
      category: data.category,
      description: data.description,
      customerName: data.customerName || null,
      notes: data.notes || null,
      createdAt: data.createdAt,
      status: 'active',
      inventoryItemId: data.inventoryItemId || null,
      quantity: qty
    }).returning();

    if (data.category === 'clothing_income' && newTx && resolvedItemId) {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, resolvedItemId));
      if (item) {
        await createCogsTransaction(tx, item, qty);
      }
    }

    return newTx;
  });
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const db = getDb();
  return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
}

/**
 * Finds the active COGS transaction linked to a clothing income transaction's inventory item.
 */
async function findCogsForTransaction(tx: any, inventoryItemId: number): Promise<any> {
  const [cogs] = await tx.select()
    .from(transactions)
    .where(
      and(
        eq(transactions.inventoryItemId, inventoryItemId),
        eq(transactions.category, 'cost_of_goods_sold'),
        eq(transactions.status, 'active')
      )
    )
    .limit(1);
  return cogs || null;
}

export async function updateTransaction(
  id: number,
  data: {
    amount: number;
    category: TransactionCategory;
    description: string;
    customerName?: string | null;
    notes?: string | null;
    createdAt: Date;
    status: TransactionRecord['status'];
    inventoryItemId?: number | null;
    quantity?: number;
  }
): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [oldTx] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx) {
      throw new Error("Transaction not found.");
    }

    const oldQty = oldTx.quantity ?? 1;
    const newQty = data.quantity ?? 1;
    const wasActiveSale = oldTx.category === 'clothing_income' && oldTx.status === 'active' && oldTx.inventoryItemId;
    const isActiveSaleNow = data.category === 'clothing_income' && data.status === 'active' && data.inventoryItemId;

    if (wasActiveSale && isActiveSaleNow) {
      if (oldTx.inventoryItemId === data.inventoryItemId) {
        const diff = newQty - oldQty;
        if (diff !== 0 && data.inventoryItemId) {
          const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
          if (!item) throw new Error("Linked product item not found.");
          const newStockQty = item.quantity - diff;
          if (newStockQty < 0) throw new Error("Insufficient stock for the new quantity.");
          await tx.update(inventoryItems)
            .set({ quantity: newStockQty })
            .where(eq(inventoryItems.id, data.inventoryItemId));
        }

        // Adjust COGS proportionally
        if (oldTx.inventoryItemId && diff !== 0) {
          const existingCogs = await findCogsForTransaction(tx, oldTx.inventoryItemId);
          if (existingCogs) {
            const [currentItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
            if (currentItem) {
              const newCogsAmount = currentItem.trueCost * newQty;
              await tx.update(transactions)
                .set({ amount: newCogsAmount, quantity: newQty })
                .where(eq(transactions.id, existingCogs.id));
            }
          }
        }
      } else {
        // Different item: restore old, decrement new
        if (oldTx.inventoryItemId) {
          const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
          if (oldItem) {
            await tx.update(inventoryItems)
              .set({ quantity: oldItem.quantity + oldQty })
              .where(eq(inventoryItems.id, oldTx.inventoryItemId));
          }

          // Remove old COGS
          const oldCogs = await findCogsForTransaction(tx, oldTx.inventoryItemId);
          if (oldCogs) {
            await tx.delete(transactions).where(eq(transactions.id, oldCogs.id));
          }
        }
        if (data.inventoryItemId) {
          const [newItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
          if (!newItem) throw new Error("New linked product item not found.");
          const newQ = newItem.quantity - newQty;
          if (newQ < 0) throw new Error("Insufficient stock for the new quantity.");
          await tx.update(inventoryItems)
            .set({ quantity: newQ })
            .where(eq(inventoryItems.id, data.inventoryItemId));

          // Create new COGS
          await createCogsTransaction(tx, newItem, newQty);
        }
      }
    } else if (wasActiveSale && !isActiveSaleNow) {
      if (oldTx.inventoryItemId) {
        const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
        if (oldItem) {
          await tx.update(inventoryItems)
            .set({ quantity: oldItem.quantity + oldQty })
            .where(eq(inventoryItems.id, oldTx.inventoryItemId));
        }

        // Remove old COGS
        const oldCogs = await findCogsForTransaction(tx, oldTx.inventoryItemId);
        if (oldCogs) {
          await tx.delete(transactions).where(eq(transactions.id, oldCogs.id));
        }
      }
    } else if (!wasActiveSale && isActiveSaleNow) {
      if (data.inventoryItemId) {
        const [newItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
        if (!newItem) throw new Error("Linked product item not found.");
        const newQ = newItem.quantity - newQty;
        if (newQ < 0) throw new Error("Insufficient stock for the new quantity.");
        await tx.update(inventoryItems)
          .set({ quantity: newQ })
          .where(eq(inventoryItems.id, data.inventoryItemId));

        // Create COGS
        await createCogsTransaction(tx, newItem, newQty);
      }
    }

    if (oldTx.status === 'refunded' && data.status === 'active') {
      await cleanupRefundReversal(tx, id);
    }

    return await tx.update(transactions)
      .set({
        amount: data.amount,
        category: data.category,
        description: data.description,
        customerName: data.customerName ?? null,
        notes: data.notes ?? null,
        createdAt: data.createdAt,
        status: data.status,
        inventoryItemId: data.inventoryItemId || null,
        quantity: newQty
      })
      .where(eq(transactions.id, id));
  });
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [oldTx] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx) {
      throw new Error("Transaction not found.");
    }

    if (oldTx.category === 'clothing_income' && oldTx.status === 'active' && oldTx.inventoryItemId) {
      const qty = oldTx.quantity ?? 1;
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
      if (item) {
        await tx.update(inventoryItems)
          .set({ quantity: item.quantity + qty })
          .where(eq(inventoryItems.id, oldTx.inventoryItemId));
      }

      // Delete associated COGS
      const cogs = await findCogsForTransaction(tx, oldTx.inventoryItemId);
      if (cogs) {
        await tx.delete(transactions).where(eq(transactions.id, cogs.id));
      }
    }

    if (oldTx.status === 'refunded') {
      await cleanupRefundReversal(tx, id);
    }

    // Also handle deleting a COGS transaction directly
    if (oldTx.category === 'cost_of_goods_sold') {
      // No stock to restore for COGS
    }

    return await tx.delete(transactions).where(eq(transactions.id, id));
  });
}

async function cleanupRefundReversal(tx: any, transactionId: number): Promise<void> {
  const [reversal] = await tx.select().from(transactions)
    .where(eq(transactions.description, `Refund courier fee reversal for transaction #${transactionId}`))
    .limit(1);
  if (reversal) {
    await tx.delete(transactions).where(eq(transactions.id, reversal.id));
  }
}

export async function refundTransaction(id: number): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [oldTx] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx) {
      throw new Error("Transaction not found.");
    }
    if (oldTx.status === 'refunded') {
      throw new Error("Transaction is already refunded.");
    }

    // Set status to refunded
    await tx.update(transactions)
      .set({ status: 'refunded' })
      .where(eq(transactions.id, id));

    if (oldTx.category === 'clothing_income' && oldTx.inventoryItemId) {
      const qty = oldTx.quantity ?? 1;
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
      if (item) {
        await tx.update(inventoryItems)
          .set({ quantity: item.quantity + qty })
          .where(eq(inventoryItems.id, oldTx.inventoryItemId));

        const courierFeePerUnit = item.trueCost - item.wholesaleCost;
        await tx.insert(transactions).values({
          amount: -(courierFeePerUnit * qty),
          category: 'clothing_overhead',
          description: `Refund courier fee reversal for transaction #${id}`,
          createdAt: new Date(),
          status: 'active'
        });

        // Refund associated COGS
        const cogs = await findCogsForTransaction(tx, oldTx.inventoryItemId);
        if (cogs) {
          await tx.update(transactions)
            .set({ status: 'refunded' })
            .where(eq(transactions.id, cogs.id));
        }
      }
    }

    // Also refund COGS if refunding a cost_of_goods_sold directly
    if (oldTx.category === 'cost_of_goods_sold' && oldTx.inventoryItemId) {
      // Find and refund the corresponding clothing_income
      const [incomeTx] = await tx.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.inventoryItemId, oldTx.inventoryItemId),
            eq(transactions.category, 'clothing_income'),
            eq(transactions.status, 'active')
          )
        )
        .limit(1);
      if (incomeTx) {
        await tx.update(transactions)
          .set({ status: 'refunded' })
          .where(eq(transactions.id, incomeTx.id));
      }
    }
  });
}
