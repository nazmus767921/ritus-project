import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// 1. Transactions Table
// Tracks both tailoring service income/expenses and clothing income/overhead, and personal expenses.
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(), // Scaled integer (Taka * 100) to represent Poisha
  category: text('category', {
    enum: [
      'personal_expense', 
      'tailoring_expense', 
      'clothing_overhead', 
      'tailoring_income', 
      'clothing_income'
    ]
  }).notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'refunded'
  inventoryItemId: integer('inventory_item_id').references(() => inventoryItems.id, { onDelete: 'set null' })
});

// 2. Shipments Table
// Logs incoming shipments of products with flat courier delivery fees.
export const shipments = sqliteTable('shipments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courierFee: integer('courier_fee').notNull(), // Scaled integer (Taka * 100)
  deliveryDate: integer('delivery_date', { mode: 'timestamp' }).notNull(),
  courierTransactionId: integer('courier_transaction_id')
});

// 3. Inventory Items Table
// Tracks current stock counts, brands, wholesale costs, and proportional courier fee adjusted true costs.
export const inventoryItems = sqliteTable('inventory_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shipmentId: integer('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }),
  brand: text('brand').notNull(),
  quantity: integer('quantity').notNull(), // Remaining stock count (must be >= 0)
  wholesaleCost: integer('wholesale_cost').notNull(), // Scaled integer (Taka * 100)
  trueCost: integer('true_cost').notNull() // Calculated: wholesaleCost + proportional courier fee (Scaled integer)
});

// 4. Settings Table
// Stores app-wide configurations (e.g. target_profit_margin for markup %, safety_pocket_target)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});
