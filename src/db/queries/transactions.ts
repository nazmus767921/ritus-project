import { desc, eq } from 'drizzle-orm';
import { getDb } from '../client';
import { transactions, inventoryItems } from '../schema';
import type { TransactionCategory, TransactionRecord } from '../types';

export async function insertTransaction(data: {
  amount: number;
  category: TransactionCategory;
  description: string;
  customerName?: string | null;
  notes?: string | null;
  createdAt: Date;
  inventoryItemId?: number | null;
  quantity?: number;
}): Promise<TransactionRecord> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const qty = data.quantity ?? 1;
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

    if (data.category === 'clothing_income' && data.inventoryItemId) {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
      if (!item) {
        throw new Error("Linked product item not found.");
      }
      if (item.quantity < qty) {
        throw new Error(`Insufficient stock: ${item.quantity} available, ${qty} requested.`);
      }
      await tx.update(inventoryItems)
        .set({ quantity: item.quantity - qty })
        .where(eq(inventoryItems.id, data.inventoryItemId));
    }
    return newTx;
  });
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const db = getDb();
  return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
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
        // Same item: adjust quantity difference
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
      } else {
        // Different item: restore old, decrement new
        if (oldTx.inventoryItemId) {
          const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
          if (oldItem) {
            await tx.update(inventoryItems)
              .set({ quantity: oldItem.quantity + oldQty })
              .where(eq(inventoryItems.id, oldTx.inventoryItemId));
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
        }
      }
    } else if (wasActiveSale && !isActiveSaleNow) {
      // Restore old quantity
      if (oldTx.inventoryItemId) {
        const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
        if (oldItem) {
          await tx.update(inventoryItems)
            .set({ quantity: oldItem.quantity + oldQty })
            .where(eq(inventoryItems.id, oldTx.inventoryItemId));
        }
      }
    } else if (!wasActiveSale && isActiveSaleNow) {
      // Decrement new quantity
      if (data.inventoryItemId) {
        const [newItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
        if (!newItem) throw new Error("Linked product item not found.");
        const newQ = newItem.quantity - newQty;
        if (newQ < 0) throw new Error("Insufficient stock for the new quantity.");
        await tx.update(inventoryItems)
          .set({ quantity: newQ })
          .where(eq(inventoryItems.id, data.inventoryItemId));
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
    }

    if (oldTx.status === 'refunded') {
      await cleanupRefundReversal(tx, id);
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
      }
    }
  });
}
