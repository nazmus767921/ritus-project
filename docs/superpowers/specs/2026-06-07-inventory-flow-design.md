# Inventory Flow Design — Auto-FIFO, Supplier Exchange & COGS

## Overview

Enhance the inventory system for a small clothing reseller with three interconnected features:
1. **Auto-FIFO** — automatically sell from the oldest stock batch first
2. **Supplier Exchange** — return faulty/unsold items for credit toward new shipments
3. **COGS Tracking** — record cost of goods sold at sale time for accurate profit

## Scope

This spec covers the clothing side only (not tailoring). Schema changes, new query logic, UI modifications, and dashboard metric updates are all in scope.

---

## 1. Supplier Tracking

### Schema

Add a `supplier` column to the `shipments` table.

```
shipments: id, courierFee, deliveryDate, courierTransactionId, supplier  -- NEW
```

- `supplier` is a text field (free-text, not a foreign key)
- Empty/unknown supplier is allowed for existing records

### Rationale

- Exchange credit only applies when returning items to the same supplier
- A full `suppliers` table is overkill — text field is sufficient for now
- Future upgrade path: add a `suppliers` table and migrate text → FK

### UI

- ShipmentForm: add a "Supplier" text input on the base step
- StockView: show supplier name in batch detail (collapsed view)
- Exchange section: only show batches whose shipment.supplier matches the new shipment's supplier

---

## 2. Supplier Exchange Flow

### What it is

When bringing in a new shipment, the user can return existing stock to the same supplier for credit. The credit (sum of returned qty × their wholesale cost) reduces the net cost of the new shipment.

### Reasons for return

- **Faulty** — damaged/defective items
- **Unsold** — items that aren't moving

Both get the same credit rate (wholesale cost). No distinction is needed in the initial version.

### Exchange credit math

```
New shipment cost     = new_qty × new_wholesale
Exchange credit       = Σ(returned_qty × old_wholesale)
Net wholesale         = new_shipment_cost − exchange_credit
Courier fee           = flat fee (allocated proportionally)
Total payable         = net_wholesale + courier_fee
```

If exchange credit exceeds new shipment cost, the surplus is **lost** (not carried forward). This simplifies the design — the user should not return more than they're buying. A validation warning is shown if credit > cost.

### Edge cases

| Case | Behavior |
|------|----------|
| No exchange | Works exactly like today |
| Credit > cost | Warning: "Credit exceeds new cost. Surplus will not be carried forward." |
| Wrong supplier | Exchange section hides batches from other suppliers |
| Item already fully returned | Not shown as available for exchange (qty = 0) |
| Faulty items previously marked | Not applicable — no tracking of faulty status yet |

### Schema changes

**New table: `exchange_items`** (optional — could also use a transaction category)

Actually, simplest approach: no new table. Track exchange as:
- Decrement returned items' quantity (like a sale but different category)
- Record a `clothing_overhead` transaction for the exchange credit (negative expense = credit)
- Or: add `supplier_return` as a new transaction category

**Decision: Add `supplier_return` transaction category.**

```
transactions.category now includes: 'supplier_return'
```

When an exchange happens:
1. Decrement quantity on returned batch(es)
2. Create a `supplier_return` transaction (negative amount = credit given)
   - amount = total credit (in poisha, negative value)
   - linked to the new shipment's courier transaction or directly to the return

Actually, let's keep it simpler. The exchange credit just reduces the `clothing_overhead` amount. The courier overhead transaction already tracks the cost of the shipment. We can just reduce its amount.

Hmm, that conflates courier fees with exchange credit. Better to have a separate transaction.

**Final decision:** Add a `supplier_return` transaction category. When an exchange happens:
1. A `supplier_return` transaction is created with amount = -credit (negative = reduction in cost)
2. The new `inventory_items` are created with their normal `wholesaleCost` and `trueCost`
3. The `trueCost` calculation stays the same (wholesale + courier allocation)
4. The exchange credit effectively flows through as a negative expense

### UI: ShipmentForm changes

**Step 2 (items):** After entering new items, a new "Exchange from stock" section:
- Shows all batches from the same supplier with remaining qty > 0
- Each row: brand, batch ID, available qty, wholesale cost, input for returned qty, reason toggle (faulty/unsold)
- Dynamic total credit displayed at bottom

**Step 3 (review):** Shows the financial summary with exchange credit line item.

### Query changes

**`createShipmentTransaction()`** in `src/db/queries/shipments.ts`:
- Accept optional `exchanges: { inventoryItemId, quantity, reason }[]`
- Inside the transaction:
  1. Insert shipment (with supplier)
  2. Insert new inventory_items
  3. For each exchange: decrement old batch qty, insert `supplier_return` transaction
  4. Insert courier overhead transaction (for actual courier fee)

**`getAvailableForExchange(supplier, brand?)`** — new query:
- Returns inventory_items from shipments with matching supplier
- Excludes items with qty = 0
- Optionally filter by brand

---

## 3. Auto-FIFO on Sale

### What it is

When selling, automatically select the oldest batch of the chosen brand with sufficient stock. No more manual batch picker for the common case.

### FIFO algorithm

```typescript
function findFifoBatch(brand: string, quantity: number): InventoryItemRecord {
  // 1. Get all batches of this brand with remaining qty > 0, ordered by id ASC
  //    (id ascending ≈ oldest first, since ids are auto-increment)
  // 2. Find the oldest batch that has qty >= requested quantity
  // 3. If none has enough, find the newest batch that can fulfill it
  //    (This is a pragmatic trade-off — pure FIFO would split across batches,
  //     but that complicates the single-transaction model)
  // 4. Return the batch (or null if all batches combined can't fulfill)
}
```

### Fallback logic

| Scenario | Behavior |
|----------|----------|
| Oldest batch has enough | Sell from oldest |
| Oldest doesn't, newest does | Sell from newest (pragmatic) |
| No single batch can fulfill | Show stock warning: "Only N units available across all batches" |
| No stock at all | Show "Out of stock" |

### Override

An "Advanced" toggle in SellSheet reveals a batch dropdown for power users who want to sell from a specific batch.

### UI changes

**SellSheet:**
- Remove the batch/stock-item dropdown for the default flow
- Add brand input (auto-suggest from existing inventory brands)
- Quantity input
- Show "Selling from: Batch #3 (oldest, 8 units available)" as info text
- Collapsible "Pick specific batch" that shows the dropdown

**TransactionForm (clothing_income):**
- Stock dropdown shows brand names (not batch IDs)
- Auto-selects the FIFO batch behind the scenes
- Advanced toggle to pick specific batch

**StockView:**
- Group by brand
- Show summary: "Product X — 13 units across 2 batches"
- Expandable to per-batch detail
- Active FIFO batch gets a subtle indicator

### Query changes

**`executeProductSale()`** in `src/db/queries/inventory.ts`:
- Add overload: accept `inventoryItemId` (explicit) or `brand + quantity` (FIFO)
- FIFO path calls `findFifoBatch()` internally

**`insertTransaction()`** in `src/db/queries/transactions.ts`:
- When category = `clothing_income` and no `inventoryItemId` provided, auto-resolve via FIFO
- Same overload pattern

### Edge cases

| Case | Behavior |
|------|----------|
| Same brand, different costs | FIFO sells from oldest; COGS reflects that batch's trueCost |
| Brand has multiple batches across suppliers | FIFO ignores supplier — just oldest batch of that brand |
| Editing a sale (updateTransaction) | If item changed, old batch gets restored, new batch gets decremented via FIFO |
| Refunding a sale | Stock goes back to the original batch (already works via inventoryItemId on the transaction) |

---

## 4. COGS on Sale

### What it is

Currently, the profit calculation is `revenue - courier_fees`. The wholesale cost of goods is invisible to the ledger. With COGS tracking, each sale records an expense equal to `trueCost × quantity` of the sold item.

### Transaction category

Add `cost_of_goods_sold` to `transactionCategory`:

```
transactions.category: 'personal_expense' | 'tailoring_expense' | 'clothing_overhead' | 'tailoring_income' | 'clothing_income' | 'supplier_return' | 'cost_of_goods_sold'
```

### When COGS is recorded

At the same time a `clothing_income` transaction is created, a corresponding `cost_of_goods_sold` transaction is also created with:
- `amount` = `item.trueCost * saleQuantity` (in poisha)
- `inventoryItemId` = the batch sold from
- `description` = `"COGS: {brand} (Batch #{id})"`
- `category` = `'cost_of_goods_sold'`

### What happens on refund/edit/delete

| Action | COGS handling |
|--------|---------------|
| **Refund sale** | Reverse the COGS transaction (set status to refunded) — same as how clothing_income is refunded |
| **Delete sale** | Delete the COGS transaction too |
| **Edit sale (qty change)** | Adjust COGS amount proportionally |
| **Edit sale (item change)** | Reverse old COGS, create new COGS for new item |

### COGS for multi-batch sales

Not applicable with the current "single batch per sale" model. If a future version allows splitting across batches, COGS would be the sum of each batch's portion.

### Profit calculation

Updated in `fetchAggregatedMetrics()`:

```typescript
const clothingCogs = sum of all active 'cost_of_goods_sold' transactions;
const clothingRevenue = sum of all active 'clothing_income' transactions;
const clothingOverhead = sum of all active 'clothing_overhead' transactions;
const clothingNet = clothingRevenue - clothingCogs - clothingOverhead;
```

### Display

- **SellSheet / transaction list**: Show "Cost: 550 Tk" next to sale entries
- **Dashboard**: Clothing profit now reflects true net (including COGS)
- **Per-batch margin**: Already available via `retailPrice - trueCost` but not yet displayed

---

## 5. Transaction Categories: Final List

| Category | Sign | Purpose |
|----------|------|---------|
| `clothing_income` | + | Revenue from clothing sales |
| `cost_of_goods_sold` | - | Wholesale + courier cost of sold items |
| `clothing_overhead` | - | Courier fees, other clothing costs |
| `supplier_return` | - | Credit from returning stock to supplier (negative = cost reduction) |
| `tailoring_income` | + | Revenue from tailoring |
| `tailoring_expense` | - | Tailoring costs |
| `personal_expense` | - | Personal withdrawals |

Dashboard formula:
```
clothingNet  = clothing_income - cost_of_goods_sold - clothing_overhead + supplier_return
tailoringNet = tailoring_income - tailoring_expense
totalProfit  = clothingNet + tailoringNet - personal_expense
```

---

## 6. Schema Changes Summary

### `shipments` table
- Add column: `supplier TEXT`

### `transactions` table
- No structural changes
- Category enum expands to include: `cost_of_goods_sold`, `supplier_return`

### `inventory_items` table
- No changes

### New indexes
- `idx_inventory_brand_qty` on `inventory_items(brand, quantity)` — for FIFO lookups
- `idx_shipments_supplier` on `shipments(supplier)` — for exchange filtering

---

## 7. File Change Summary

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `supplier` to shipments, update category enum |
| `src/db/types.ts` | Update TransactionCategory, add new types |
| `src/db/client.ts` | Migration for new column |
| `src/db/queries/shipments.ts` | `createShipmentTransaction()` — accept exchanges + supplier; new `getAvailableForExchange()` |
| `src/db/queries/inventory.ts` | `executeProductSale()` — add FIFO resolution; create COGS tx |
| `src/db/queries/transactions.ts` | `insertTransaction()` — add FIFO resolution for clothing_income; COGS handling in edit/refund/delete |
| `src/db/queries/dashboard.ts` | Include COGS + supplier_return in metrics |
| `src/components/ShipmentForm.tsx` | Add supplier input + exchange section |
| `src/components/SellSheet.tsx` | Remove batch picker, add FIFO info + advanced override |
| `src/components/TransactionForm.tsx` | Brand dropdown with FIFO, advanced batch picker |
| `src/components/StockView.tsx` | Group by brand, expandable batches |
| `src/lib/math/allocator.ts` | No change |
| `src/lib/math/rounding.ts` | No change |

---

## 8. Implementation Order

1. Schema changes (supplier column, category enum)
2. Supplier field in ShipmentForm
3. Exchange section in ShipmentForm + createShipmentTransaction changes
4. COGS recording on sale + dashboard metrics update
5. Auto-FIFO resolution in executeProductSale + insertTransaction
6. StockView grouping
7. SellSheet/TransactionForm UI simplification
8. Edge case handling (edit/refund/delete with COGS)

---

## 9. Future Considerations (out of scope)

- **Full suppliers table** with contact info, history
- **Carry-forward credit** for exchange surplus
- **Automatic FIFO split** across batches (one sale, multiple batch decrements)
- **Supplier-specific pricing** (different wholesale rates per supplier)
- **Barcode/scanning integration**
- **Low stock alerts**
