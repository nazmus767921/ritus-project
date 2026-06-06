# Implementation Plan - Feature Set & Improvements

This plan outlines the design and implementation details for the requested features and improvements for ClothEx:
1. Remove the Math Playground.
2. Add Edit/Delete capabilities for Transactions and Shipments.
3. Add Return/Refund feature (specifically incrementing stock and marking transactions as refunded).
4. Add Budget Goal Setter (minimum Safety Pocket limit).
5. Add Stock Selector to the main Transaction Form (auto-decrementing stock and pre-filling price).
6. Add Local Backup & Restore system (both manual downloads and automatic browser-state storage).
7. Implement Dynamic Profit Margin Math to suggest preferred selling prices.
8. Add a Reports Tab with KPIs, SVG bar charts, and monthly breakdown tables.

---

## User Review Required

> [!IMPORTANT]
> **Database Migrations**: Since we are using Drizzle with SQLite in-browser, modifying schemas (adding columns and new tables) requires executing schema migration updates during database initialization (`initDb`). We will implement automatic schema alterations upon initialization to prevent data loss of existing user transactions.

---

## Proposed Changes

### 1. Database Schema

#### [MODIFY] [schema.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/db/schema.ts)
- **Settings Table**: Add `settings` table to store target safety pocket and target markup. The existing `target_profit_margin` key is retained as the stored markup percentage for compatibility.
- **Transactions Table**:
  - Add `status` column: text (`'active' | 'refunded'`), defaulting to `'active'`.
  - Add `inventoryItemId` column: integer, referencing `inventory_items.id` (nullable).
- Add foreign key / indexes where appropriate.

```typescript
// settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});

// modified transactions table
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(),
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
```

---

### 2. Business & Mathematical Logic

#### [NEW] [pricing.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/lib/math/pricing.ts)
- Implement markup-based preferred price suggestions:
  - Let $M$ = Target markup percentage (e.g. 0.50 for 50% over true cost).
  - Preferred Selling Price = $TrueCost \times (1 + M)$.
  - Reports continue to calculate profit margin from real sale results:
    $$ProfitMargin = \frac{Revenue - Cost}{Revenue}$$

#### [NEW] [backup.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/lib/backup/backup.ts)
- Implement backup exporter/importer:
  - Export: serialize `transactions`, `shipments`, `inventory_items`, and `settings` as a JSON string.
  - Import: parse JSON, clear tables, and write all records in a single database transaction.
  - Auto-backup Local: write JSON string to IndexedDB or localStorage under a separate key `clothex_auto_backup` on any data mutations.
  - Manual Backup: allow triggering local downloads of the JSON backup file and uploading it to restore.

---

### 3. Database Queries

#### [MODIFY] [transactions.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/db/queries/transactions.ts)
- Update `insertTransaction` to support optional `inventoryItemId`.
- Add `updateTransaction(id, data)`:
  - If editing a `clothing_income` transaction:
    - If the `inventoryItemId` changed, restore stock (+1) for the old item, decrement stock (-1) for the new item.
- Add `deleteTransaction(id)`:
  - If the transaction has a linked `inventoryItemId`, restore its stock (+1) before deleting the transaction.
- Add `refundTransaction(id)`:
  - Mark transaction status as `'refunded'`.
  - If it has a linked `inventoryItemId`, increment its stock by 1.

#### [MODIFY] [shipments.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/db/queries/shipments.ts)
- Add `deleteShipment(id)`:
  - Delete shipment header. (Cascade deletes inventory items via database foreign key constraint).
  - Delete the associated courier fee overhead transaction from `transactions`.
- Add `updateShipment(id, courierFee, items)`:
  - Relog items and recalculate true costs using Option A allocation. Update the courier fee transaction.

#### [NEW] [settings.ts](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/db/queries/settings.ts)
- Add queries to read/write keys in `settings` table (e.g. `getSetting`, `setSetting`).

---

### 4. UI Components

#### [MODIFY] [App.tsx](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/App.tsx)
- Delete the Option A Calculator Playground and the relational sandbox control buttons.
- Modify tab bar to support four tabs: `dashboard` (Metrics), `finances` (Finances List & CRUD), `inventory` (Stock & Shipments), and `reports` (KPIs & Monthly performance charts).
- Include Settings inputs (or a Settings overlay) to define **Expected Markup %** and **Target Safety Pocket**.
- Add automatic local backup trigger on save transactions/shipments/refunds.

#### [MODIFY] [TransactionForm.tsx](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/components/TransactionForm.tsx)
- Update form to handle edit mode (prefilling values based on transaction input).
- When category is `clothing_income` (Clothing Retail Sale), display an Inventory Item Selector:
  - Dropdown containing active stock items (brand name, batch ID, current stock count).
  - On select, prefill amount field with the calculated preferred selling price based on target markup.
  - On save, decrement stock (-1) and save transaction linked to `inventoryItemId`.

#### [MODIFY] [DashboardView.tsx](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/components/DashboardView.tsx)
- Display the preferred selling price for each item inside the active stock list table.
- Display a warning banner if the Safety Pocket falls below the **Target Safety Pocket** setting.
- Update Mascot dialogue triggers:
  - If Safety Pocket is below target budget, make the Mascot warn the user.
  - Adjust dialogue lines based on budget and inventory targets.

#### [NEW] [ReportsView.tsx](file:///c:/Users/Admin/Desktop/Projects/ritus-project/src/components/ReportsView.tsx)
- Add Reports Page tab content:
  - **KPI grid**:
    - **Total Inflow vs Outflow**: sum of all income categories vs overhead/expenses.
    - **Actual Margin**: profit margin of sold clothing items.
    - **Expectation Meet Rate**: percentage of active sales that matched or exceeded the preferred selling price suggestion.
  - **SVG Bar Chart**: display monthly sales (neon green bars) and profits (electric purple bars) side-by-side using simple SVG components.
  - **Monthly Breakdown Table**: list month-by-month values for Sales, Profit, and Expenses.

---

## Verification Plan

### Automated Tests
- Run `npm run test` using Vitest to verify calculation accuracy.
- Add test coverage for:
  - `pricing.ts` markup preferred price and profit margin formulas.
  - Database schema changes (inserting/updating transactions with stock links, cascade deletes on shipments).

### Manual Verification
1. Open dashboard, set expected markup to 20% and Safety Pocket target to 1000 Taka.
2. Log a personal expense transaction that forces Safety Pocket below 1000 Taka; verify that the warning banner displays and the Mascot complains.
3. Add a shipment of 10 items with 150 Taka courier fee; check that the preferred price suggests 20% markup over true unit cost.
4. Record a sale below the preferred price; verify that Reports still calculate actual margin from sale revenue and true cost.
5. In the Transaction Form, select "Clothing Retail Sale", pick a stock item, verify price auto-fills, and click save. Check that stock count decrements by 1.
6. Trigger a refund on a transaction; verify that stock is restored and financial records are adjusted.
7. Trigger local backup download, delete a transaction, and restore from the downloaded backup. Verify original state is restored.
