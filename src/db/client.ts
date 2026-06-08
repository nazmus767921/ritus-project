// @ts-ignore
import sqlite3InitModule from '@vlcn.io/wa-sqlite/dist/crsqlite.mjs';
// @ts-ignore
import { Factory } from '@vlcn.io/wa-sqlite';
// @ts-ignore
import { IDBBatchAtomicVFS } from '@vlcn.io/wa-sqlite/src/examples/IDBBatchAtomicVFS.js';
// @ts-ignore
import wasmUrl from '@vlcn.io/wa-sqlite/dist/crsqlite.wasm?url';

import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

let dbInstance: any = null;
let sqlite3Instance: any = null;
let rawDbPtr: number = 0;

let queryQueue = Promise.resolve();

/**
 * Initializes the wa-sqlite database engine with IndexedDB persistence,
 * creates the physical schema tables if missing, and initializes Drizzle ORM.
 */
export async function initDb() {
  if (dbInstance) return dbInstance;

  // Initialize the WebAssembly SQLite wrapper
  const Module = await sqlite3InitModule({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        return wasmUrl;
      }
      return file;
    }
  });

  const sqlite3 = Factory(Module);
  sqlite3Instance = sqlite3;

  // Register the IndexedDB-backed Virtual File System (VFS) to persist operational blocks locally
  const vfsName = 'clothex_idb_vfs';
  const vfs = new IDBBatchAtomicVFS(vfsName);
  sqlite3.vfs_register(vfs, true);

  // Open/Create database file on IndexedDB VFS
  // SQLITE_OPEN_CREATE (0x4) | SQLITE_OPEN_READWRITE (0x2) = 0x6
  const dbPtr = await sqlite3.open_v2('clothex.db', 0x6, vfsName);
  rawDbPtr = dbPtr;
  await sqlite3.exec(dbPtr, 'PRAGMA foreign_keys = ON;');

  // Enforce schema constraints and table initialization before executing queries
  await sqlite3.exec(dbPtr, `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await sqlite3.exec(dbPtr, `
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courier_fee INTEGER NOT NULL,
      delivery_date INTEGER NOT NULL
    );
  `);

  await sqlite3.exec(dbPtr, `
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
      brand TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      wholesale_cost INTEGER NOT NULL,
      true_cost INTEGER NOT NULL
    );
  `);

  // Migrate schema for transactions table additions (try-catch prevents errors if columns already exist)
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE transactions ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE SET NULL;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema for shipments table additions
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE shipments ADD COLUMN courier_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema for inventory_items table additions
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE inventory_items ADD COLUMN initial_quantity INTEGER NOT NULL DEFAULT 0;`);
    await sqlite3.exec(dbPtr, `UPDATE inventory_items SET initial_quantity = quantity;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema for transactions table additions (customer_name, notes)
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE transactions ADD COLUMN customer_name TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE transactions ADD COLUMN notes TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema for transactions table additions (quantity)
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE transactions ADD COLUMN quantity INTEGER DEFAULT 1;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Migrate schema for shipments table additions (supplier)
  try {
    await sqlite3.exec(dbPtr, `ALTER TABLE shipments ADD COLUMN supplier TEXT;`);
  } catch (e) {
    // Ignore error if column already exists
  }

  // Create index for FIFO lookups
  try {
    await sqlite3.exec(dbPtr, `CREATE INDEX IF NOT EXISTS idx_inventory_brand_qty ON inventory_items(brand, quantity);`);
  } catch (e) {
    // Ignore error
  }

  // Create index for exchange filtering
  try {
    await sqlite3.exec(dbPtr, `CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON shipments(supplier);`);
  } catch (e) {
    // Ignore error
  }

  // Create settings table
  await sqlite3.exec(dbPtr, `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Data migration: convert clothing_income amount from unit price to total price
  // Old code stored unit price as amount; new code stores total = unit_price * quantity
  // Guarded by a settings key to run exactly once.
  try {
    const migrateSql = sqlite3.str_new(dbPtr, `SELECT value FROM settings WHERE key = 'mig_v2_amount_total'`);
    const migratePtr = sqlite3.str_value(migrateSql);
    const migratePrep = await sqlite3.prepare_v2(dbPtr, migratePtr);
    let alreadyMigrated = false;
    if (migratePrep) {
      if (await sqlite3.step(migratePrep.stmt) === 100) {
        alreadyMigrated = sqlite3.column(migratePrep.stmt, 0) === '1';
      }
      await sqlite3.finalize(migratePrep.stmt);
    } else {
      alreadyMigrated = false;
    }
    sqlite3.str_finish(migrateSql);

    if (!alreadyMigrated) {
      await sqlite3.exec(dbPtr, `UPDATE transactions SET amount = amount * COALESCE(NULLIF(quantity, 0), 1) WHERE category = 'clothing_income'`);
      await sqlite3.exec(dbPtr, `INSERT INTO settings (key, value) VALUES ('mig_v2_amount_total', '1')`);
    }
  } catch (e) {
    // ignore during initial setup when tables may not exist
  }

  // Build the Drizzle client bridge using the sqlite-proxy driver.
  // Operations are serialized through a queue to prevent race conditions
  // on the WASM temp buffer (tmpPtr) used by prepare_v2 and other internals.
  dbInstance = drizzle(
    async (sql, params, method) => {
      let release: (() => void) | undefined;
      const prev = queryQueue;
      queryQueue = new Promise<void>(resolve => { release = resolve; });
      await prev;

      try {
        const str = sqlite3.str_new(dbPtr, sql);
        const sqlPtr = sqlite3.str_value(str);
        const prepared = await sqlite3.prepare_v2(dbPtr, sqlPtr);

        if (!prepared) {
          sqlite3.str_finish(str);
          return { rows: [] };
        }

        const stmt = prepared.stmt;

        try {
          if (params && params.length > 0) {
            sqlite3.bind_collection(stmt, params);
          }

          const rows: any[][] = [];
          const isQuery = method !== 'run';

          while (await sqlite3.step(stmt) === 100) {
            if (isQuery) {
              const colCount = sqlite3.column_count(stmt);
              const row: any[] = [];
              for (let i = 0; i < colCount; i++) {
                let val = sqlite3.column(stmt, i);
                if (typeof val === 'bigint') {
                  val = Number(val);
                }
                row.push(val);
              }
              rows.push(row);
            }
          }

          if (isQuery) {
            if (method === 'get') {
              return { rows: rows[0] || [] };
            }
            return { rows };
          } else {
            return { rows: [] };
          }
        } finally {
          await sqlite3.finalize(stmt);
          sqlite3.str_finish(str);
        }
      } finally {
        release?.();
      }
    },
    { schema }
  );

  return dbInstance;
}

/**
 * Retrieves the initialized Drizzle instance.
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database is not initialized. Call initDb() first.');
  }
  return dbInstance;
}

/**
 * Returns raw sqlite3 instance pointers for low-level diagnostic operations.
 */
export function getRawSqlite() {
  return { sqlite3: sqlite3Instance, dbPtr: rawDbPtr };
}
