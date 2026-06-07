import { getDb } from '../../db/client';
import { transactions, shipments, inventoryItems, settings } from '../../db/schema';

const AUTO_BACKUP_KEY = 'clothex_auto_backup';
let backupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Serializes all SQLite tables to a JSON backup string.
 */
export async function exportDbToJson(): Promise<string> {
  const db = getDb();
  const txs = await db.select().from(transactions);
  const shps = await db.select().from(shipments);
  const items = await db.select().from(inventoryItems);
  const sets = await db.select().from(settings);

  const backupData = {
    version: 1,
    timestamp: Date.now(),
    transactions: txs,
    shipments: shps,
    inventoryItems: items,
    settings: sets
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Clears existing database tables and imports all serialized records from a JSON string.
 */
export async function importDbFromJson(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);
  if (!data.transactions || !data.shipments || !data.inventoryItems) {
    throw new Error("Invalid backup file format.");
  }

  const db = getDb();
  await db.transaction(async (tx: any) => {
    // 1. Wipe existing databases (order matters to prevent foreign key errors)
    await tx.delete(transactions);
    await tx.delete(inventoryItems);
    await tx.delete(shipments);
    await tx.delete(settings);

    // 2. Insert Shipments
    if (data.shipments && data.shipments.length > 0) {
      for (const s of data.shipments) {
        await tx.insert(shipments).values({
          id: s.id,
          courierFee: s.courierFee,
          deliveryDate: new Date(s.deliveryDate),
          courierTransactionId: s.courierTransactionId || null
        });
      }
    }

    // 3. Insert Inventory Items
    if (data.inventoryItems && data.inventoryItems.length > 0) {
      for (const item of data.inventoryItems) {
        await tx.insert(inventoryItems).values({
          id: item.id,
          shipmentId: item.shipmentId,
          brand: item.brand,
          quantity: item.quantity,
          initialQuantity: item.initialQuantity ?? item.quantity,
          wholesaleCost: item.wholesaleCost,
          trueCost: item.trueCost
        });
      }
    }

    // 4. Insert Transactions
    if (data.transactions && data.transactions.length > 0) {
      for (const t of data.transactions) {
        await tx.insert(transactions).values({
          id: t.id,
          amount: t.amount,
          category: t.category,
          description: t.description,
          customerName: t.customerName || null,
          notes: t.notes || null,
          createdAt: new Date(t.createdAt),
          status: t.status || 'active',
          quantity: t.quantity ?? 1,
          inventoryItemId: t.inventoryItemId || null
        });
      }
    }

    // 5. Insert Settings
    if (data.settings && data.settings.length > 0) {
      for (const s of data.settings) {
        await tx.insert(settings).values({
          key: s.key,
          value: s.value
        });
      }
    }
  });
}

/**
 * Triggers a browser file download of the JSON backup.
 */
export function triggerManualDownload(jsonStr: string) {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `clothex_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Automatically saves a backup JSON snapshot to localStorage, debounced (2s).
 * Multiple rapid mutations will only trigger one backup after a quiet period.
 */
export function autoBackupLocal(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
  }
  backupTimer = setTimeout(async () => {
    try {
      const jsonStr = await exportDbToJson();
      localStorage.setItem(AUTO_BACKUP_KEY, jsonStr);
    } catch (err) {
      console.error("Local auto backup failed:", err);
    }
  }, 2000);
}

/**
 * Restores the database from the auto-backup in localStorage.
 */
export async function restoreFromAutoBackup(): Promise<boolean> {
  try {
    const jsonStr = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!jsonStr) return false;
    await importDbFromJson(jsonStr);
    return true;
  } catch (err) {
    console.error("Restoring from auto backup failed:", err);
    return false;
  }
}

/**
 * Checks if an auto-backup snapshot exists.
 */
export function hasAutoBackup(): boolean {
  return localStorage.getItem(AUTO_BACKUP_KEY) !== null;
}
