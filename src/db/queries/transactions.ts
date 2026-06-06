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
}): Promise<TransactionRecord> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [newTx] = await tx.insert(transactions).values({
      amount: data.amount,
      category: data.category,
      description: data.description,
      customerName: data.customerName || null,
      notes: data.notes || null,
      createdAt: data.createdAt,
      status: 'active',
      inventoryItemId: data.inventoryItemId || null
    }).returning();

    // If active clothing income and inventory item is linked, decrement stock by 1
    if (data.category === 'clothing_income' && data.inventoryItemId) {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
      if (!item) {
        throw new Error("Linked product item not found.");
      }
      if (item.quantity <= 0) {
        throw new Error("Linked item is out of stock.");
      }
      await tx.update(inventoryItems)
        .set({ quantity: item.quantity - 1 })
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
  }
): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [oldTx] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!oldTx) {
      throw new Error("Transaction not found.");
    }

    const wasActiveSale = oldTx.category === 'clothing_income' && oldTx.status === 'active' && oldTx.inventoryItemId;
    const isActiveSaleNow = data.category === 'clothing_income' && data.status === 'active' && data.inventoryItemId;

    if (wasActiveSale && isActiveSaleNow) {
      // If the inventory item changed, restore stock to the old one and decrement the new one
      if (oldTx.inventoryItemId !== data.inventoryItemId) {
        if (oldTx.inventoryItemId) {
          const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
          if (oldItem) {
            await tx.update(inventoryItems)
              .set({ quantity: oldItem.quantity + 1 })
              .where(eq(inventoryItems.id, oldTx.inventoryItemId));
          }
        }
        if (data.inventoryItemId) {
          const [newItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
          if (!newItem) {
            throw new Error("New linked product item not found.");
          }
          if (newItem.quantity <= 0) {
            throw new Error("New linked item is out of stock.");
          }
          await tx.update(inventoryItems)
            .set({ quantity: newItem.quantity - 1 })
            .where(eq(inventoryItems.id, data.inventoryItemId));
        }
      }
    } else if (wasActiveSale && !isActiveSaleNow) {
      // It was an active sale, but no longer is. Restore the stock.
      if (oldTx.inventoryItemId) {
        const [oldItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
        if (oldItem) {
          await tx.update(inventoryItems)
            .set({ quantity: oldItem.quantity + 1 })
            .where(eq(inventoryItems.id, oldTx.inventoryItemId));
        }
      }
    } else if (!wasActiveSale && isActiveSaleNow) {
      // It wasn't an active sale, but now it is. Decrement stock.
      if (data.inventoryItemId) {
        const [newItem] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, data.inventoryItemId));
        if (!newItem) {
          throw new Error("Linked product item not found.");
        }
        if (newItem.quantity <= 0) {
          throw new Error("Linked item is out of stock.");
        }
        await tx.update(inventoryItems)
          .set({ quantity: newItem.quantity - 1 })
          .where(eq(inventoryItems.id, data.inventoryItemId));
      }
    }

    // Update the transaction
    return await tx.update(transactions)
      .set({
        amount: data.amount,
        category: data.category,
        description: data.description,
        customerName: data.customerName ?? null,
        notes: data.notes ?? null,
        createdAt: data.createdAt,
        status: data.status,
        inventoryItemId: data.inventoryItemId || null
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

    // If it was an active sale, restore stock count
    if (oldTx.category === 'clothing_income' && oldTx.status === 'active' && oldTx.inventoryItemId) {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
      if (item) {
        await tx.update(inventoryItems)
          .set({ quantity: item.quantity + 1 })
          .where(eq(inventoryItems.id, oldTx.inventoryItemId));
      }
    }

    return await tx.delete(transactions).where(eq(transactions.id, id));
  });
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

    // If it is linked to an inventory item, restore stock and reverse courier fee allocation
    if (oldTx.category === 'clothing_income' && oldTx.inventoryItemId) {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, oldTx.inventoryItemId));
      if (item) {
        // Restore stock
        await tx.update(inventoryItems)
          .set({ quantity: item.quantity + 1 })
          .where(eq(inventoryItems.id, oldTx.inventoryItemId));

        // Reverse the proportional courier fee that was allocated to this item
        const courierFeePerUnit = item.trueCost - item.wholesaleCost;
        if (courierFeePerUnit > 0) {
          await tx.insert(transactions).values({
            amount: -courierFeePerUnit,
            category: 'clothing_overhead',
            description: `Refund courier fee reversal for transaction #${id}`,
            createdAt: new Date(),
            status: 'active'
          });
        }
      }
    }
  });
}
