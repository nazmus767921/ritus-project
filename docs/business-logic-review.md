# Comprehensive Business Logic Review

> **Date:** 2026-06-07
> **Scope:** Every source file under `src/` (excl. commands/ and node_modules/)
> **Method:** Full data-flow trace, every calculation path, every label vs. actual computation, edge-case analysis, backup/restore integrity

---

## CRITICAL ISSUES

### C1. Backup restore drops `initialQuantity`, `courierTransactionId`, and transaction metadata

**File:** `src/lib/backup/backup.ts:60-82`

**Problem:** `importDbFromJson` does not restore `initialQuantity` on inventory items, nor `courierTransactionId` on shipments, nor `quantity`/`customerName`/`notes` on transactions. The insert statements only include a subset of columns.

**Consequences:**
- **Inventory:** `initialQuantity` defaults to 0 on restore → `totalAvailableStock = 0`, `totalSoldQuantity = 0 - totalRemainingStock = negative`. All inventory metrics are broken after any restore.
- **Shipments:** `courierTransactionId` is lost → deleting a restored shipment cannot locate its courier overhead transaction (orphaned).
- **Transactions:** `quantity` defaults to 1 on restore → refunding a restored multi-item sale only restocks 1 unit. `customerName` and `notes` are lost.

**Severity:** Data loss. Any backup restore silently corrupts inventory metrics, financial links, and transaction details.

**Fix:** Include all columns in the restore INSERT statements. The JSON export (`exportDbToJson` line 12-14) fetches all columns — the data IS in the file, the restore just ignores it.

---

### C2. Historical profit rewrites when shipments are updated

**Files:** `src/db/queries/shipments.ts:86-161` (updateShipment), `src/components/ReportsView.tsx:33-37`, `src/db/queries/dashboard.ts:26-34`

**Problem:** `ReportsView` and `fetchAggregatedMetrics` calculate clothing COGS dynamically as `current_inventory_item.trueCost * transaction.quantity`. When `updateShipment` changes an item's `trueCost`, ALL past sales referencing that item show recalculated COGS.

**Example flow:**
1. Shipment: 10 items, trueCost=62000 each → sale of 5 shows profit = `sale_revenue - (62000 × 5)`
2. Shipment edited: trueCost changed to 70000
3. Same 5 historical sales now show profit = `sale_revenue - (70000 × 5)`

**Severity:** Financial reports are not immutable. Any shipment edit retroactively changes all connected profit history.

**Fix:** Snapshot COGS at sale time (e.g. a `costAtSale` column on the transaction), or disallow trueCost changes once sales exist.

---

### C3. Increasing stock via shipment edit breaks inventory metrics

**File:** `src/db/queries/shipments.ts:108-120`

**Problem:** When `updateShipment` increases an existing item's `quantity`, the `initialQuantity` is preserved from the original record (line 116). Since `totalAvailableStock = sum(initialQuantity)` and `totalSoldQuantity = available - remaining`, the sold count can go negative.

**Example:** Item had `initialQuantity=10, quantity=10`. Edit to `quantity=15`. Now:
- `totalAvailableStock` still counts 10 (unchanged)
- `totalRemainingStock` = 15 (increased)
- `totalSoldQuantity` = 10 - 15 = **-5** (impossible)

**Severity:** Dashboard inventory metrics become nonsensical after legitimate stock additions.

**Fix:** Either update `initialQuantity` to match the new total quantity, or treat stock additions as new line items, or disallow increasing quantity on existing items.

---

### C4. Missing `PRAGMA foreign_keys = ON` — all FK constraints silently ignored

**File:** `src/db/client.ts` (entire file)

**Problem:** SQLite requires `PRAGMA foreign_keys = ON` to enforce foreign key constraints. The code never sets this pragma. All `REFERENCES(...)` clauses, `ON DELETE CASCADE`, and `ON DELETE SET NULL` in the schema are **silent no-ops**.

**Affected constraints:**
- `transactions.inventory_item_id → inventory_items.id ON DELETE SET NULL` — not enforced
- `inventory_items.shipment_id → shipments.id ON DELETE CASCADE` — not enforced
- `shipments.courier_transaction_id → transactions.id ON DELETE SET NULL` — not enforced

**Consequences:**
- `deleteShipment` (shipments.ts:70-81) deletes only the shipment row and its courier transaction. Without CASCADE, inventory items are **orphaned** — they still exist with a dangling `shipmentId` reference. The confirmation dialog tells the user "This will cascade delete its inventory items" but this is false.
- Even if CASCADE worked, `ON DELETE SET NULL` on transactions would break COGS links (see C4b below).
- No referential integrity for any cross-table operation.

**Severity:** All foreign key-based data integrity guarantees are absent. The app relies entirely on manual cleanup in query functions, and `deleteShipment` doesn't clean up inventory items.

**Fix:** Add `PRAGMA foreign_keys = ON` after opening the database (client.ts:47).

---

### C4b. Shipment delete orphans inventory items (FK not enforced) — items remain with dangling shipmentId

**Files:** `src/db/queries/shipments.ts:70-81`, `src/db/schema.ts:23`

**Problem:** Even without FK enforcement, the design intent is that deleting a shipment removes its items. `deleteShipment` manually deletes the courier transaction but **does not delete inventory items**. This leaves orphaned items with non-existent `shipmentId`. These items still appear in stock listings but their shipment link is broken.

**Additionally**, if FK enforcement were enabled (fixing C4), the `ON DELETE SET NULL` on `transactions.inventory_item_id` would set the link to NULL, causing:
- `ReportsView` clothing cost filter (`.filter(t => ... && t.inventoryItemId != null)`) would exclude those sales from COGS
- Revenue remains counted but COGS drops to zero → margins inflated

**Severity:** Currently the items survive as orphans (mild confusion). If FK is fixed, the revenue/cost mismatch becomes a severe reporting error.

**Fix:** Either prevent shipment deletion when sales exist, OR snapshot COGS at sale time (same fix as C2), OR manually set `inventoryItemId = NULL` on affected transactions AND delete inventory items in `deleteShipment`.

---

## HIGH ISSUES

### H1. Refund courier fee reversal only reverses 1 unit

**File:** `src/db/queries/transactions.ts:196-198`

**Problem:** On refund, the negative overhead entry is created with `amount: -courierFeePerUnit`, regardless of the sale's quantity. If a transaction sold 3 items, the reversal should be `-(courierFeePerUnit × 3)`.

```typescript
const courierFeePerUnit = item.trueCost - item.wholesaleCost;
if (courierFeePerUnit > 0) {
  await tx.insert(transactions).values({
    amount: -courierFeePerUnit,  // ← should be -(courierFeePerUnit * qty)
```

**Example:** Courier allocated 3333 per unit. Sale of 3 units refunded. Reversal = -3333, but should be -9999. Net clothing_overhead is understated by 6666.

**Severity:** Systematic error that grows with multi-item refunds.

---

### H2. Editing refunded transaction back to active leaves orphan negative overhead

**File:** `src/db/queries/transactions.ts:67-147`

**Problem:** When a refunded transaction is edited (status changed back to `'active'`), the negative courier reversal overhead created during refund still exists as an active transaction. This permanently understates clothing_overhead.

**Trigger scenario:**
1. Sale created → `clothing_income` +10000
2. Refunded → status='refunded', stock restored, negative overhead -3333 created
3. Transaction edited: status changed back to 'active', amount changed
4. Now: sale counts as income, but -3333 overhead still exists → net profit inflated by 3333

**Severity:** Manual data correction required. No automatic cleanup path.

---

### H3. `roundPrice` on wholesaleCost and trueCost forces 10-Taka granularity

**Files:** `src/db/queries/shipments.ts:42-43`, `src/lib/math/rounding.ts:6-8`, `src/db/schema.ts:43-44`

**Problem:** `createShipmentTransaction` stores both `wholesaleCost` and `trueCost` through `roundPrice()`, which snaps to the nearest 10 Taka (1000 Poisha). The schema comment says "Taka * 100" (1 Poisha precision), but actual storage is 10× coarser.

**Example:** User enters wholesale cost 120.50 Taka. `Math.round(120.50 × 100) = 12050`. `roundPrice(12050) = 12000`. Stored as 120.00 Taka. The 0.50 Taka is silently lost.

**Severity:** Cumulative precision loss across hundreds of items can become significant. Schema documentation is misleading.

**Fix:** Use `Math.round(cost)` (1-Taka granularity) or store raw Poisha without `roundPrice` on cost fields. `roundPrice` is designed for retail prices, not costs.

---

### H4. Wrong domain direction for `formatCurrency` with negative values

**File:** `src/lib/math/rounding.ts:10-13`

**Problem:** `formatCurrency(-50000)` produces `-৳500`. The minus sign precedes the Taka symbol. In Bengali locale conventions, the minus typically follows the currency symbol or is parenthesized. This is a cosmetic issue but affects professional appearance.

```
// Current: -৳500
// Convention: ৳-500 or (৳500)
```

---

## MEDIUM ISSUES

### M1. "Total Business Profit" described as "Combined business income"

**File:** `src/components/DashboardView.tsx:53`

```typescript
{
  label: 'Total Business Profit',          // ← "Profit" — correct for net profit
  value: metrics.totalBusinessProfit,
  description: 'Combined business income', // ← "income" implies revenue, but value is net profit
}
```

The value is `(tailoringIncome - tailoringExpense) + (clothingIncome - clothingOverhead)`, which is **net profit**, not gross income. The description contradicts the label.

---

### M2. Unlinked clothing_income sales unconditionally pass target-price meet rate

**File:** `src/components/ReportsView.tsx:43-49`

```typescript
const salesMeetingTarget = clothingSales.filter(t => {
  if (!t.inventoryItemId) return true;  // ← always passes regardless of price
  if (!item) return true;               // ← always passes if item was deleted
  ...
});
```

If a clothing_income transaction has no linked inventory item (or references a deleted item), it's counted as "meeting target price" in the **Target Price Meet Rate** KPI, even if sold at a loss.

**Severity:** KPI inflated when data integrity is broken.

---

### M3. Double `roundPrice` in SellSheet flow (inconsistent with TransactionForm)

**Files:** `src/components/SellSheet.tsx:51-52`, `src/db/queries/inventory.ts:36`, `src/components/TransactionForm.tsx:99-113`

**SellSheet path:** `roundPrice(roundPrice(unitPrice × 100) × quantity)` — roundPrice applied twice
**TransactionForm path:** `roundPrice(unitPrice × 100) × quantity` — roundPrice applied once

Currently idempotent because roundPrice returns multiples of 1000, but a code inconsistency that could diverge if rounding logic changes.

---

### M4. Data migration `mig_v2_amount_total` is unreachable dead code

**File:** `src/db/client.ts:138-159`

**Problem:** The variable `alreadyMigrated` starts as `true` (line 142). The SQL query that checks the settings key only sets it to `false` when `sqlite3.step(...) === 100` (SQLITE_ROW). If no row exists (migration pending), step returns `101` (SQLITE_DONE) and `alreadyMigrated` stays `true`. The migration at lines 153-156 never executes.

```typescript
let alreadyMigrated = true;  // ← starts true
if (migratePrep) {
  if (await sqlite3.step(migratePrep.stmt) === 100) {
    alreadyMigrated = sqlite3.column(migratePrep.stmt, 0) === '1';
  }
  // if step returns 101 (no row), alreadyMigrated stays true
}
```

**Severity:** Low (legacy migration on data that was presumably already migrated), but the logic is broken by design.

---

### M5. Refund courier reversal rounding: sum ≠ original fee

**File:** `src/db/queries/transactions.ts:196-204`, `src/lib/math/allocator.ts:26`

**Problem:** `perUnitFee = Math.round(courierFee / totalUnits)`. When all items in a shipment are refunded, the sum of per-unit negative entries may not equal the original courier fee due to integer rounding.

**Example:** courierFee=10000 (100 Taka), 3 items → perUnitFee=round(10000/3)=3333. Refund all 3: negative overheads = -3333 × 3 = -9999, original overhead = +10000. Net = +1 Poisha discrepancy.

**Severity:** Small but systematic — accumulates with every refund across the app's lifetime.

---

### M6. Courier fee reversal is created even when no courier fee was allocated

**File:** `src/db/queries/transactions.ts:196`

**Problem:** The refund creates a reversal when `item.trueCost - item.wholesaleCost > 0`. But if an item's per-unit courier fee rounds to 0 (e.g., courierFee=50, totalUnits=200 → perUnitFee=0), trueCost == wholesaleCost, and no reversal is created. The item is returned to stock, but the full courier fee was already logged as overhead. This is inconsistent — sometimes there's a reversal, sometimes not, depending on rounding.

---

### M7. Negative clothing_overhead from refund reversal distorts clothing overhead totals

**File:** `src/db/queries/transactions.ts:196-204`

**Problem:** The refund creates a `clothing_overhead` transaction with a **negative** amount. While the intention is to reverse the allocated cost, this means the `clothing_overhead` category can have negative sums. In the Dashboard and Reports, `clothing_overhead` is treated as an expense category, and the total is calculated as `sum(amount)` — with negative values reducing the expense total, effectively inflating profit.

This is a design choice (reversal-based accounting), but it means the `clothing_overhead` total no longer represents actual overhead paid — it represents "overhead paid minus estimated fee reversals."

---

## LOW ISSUES

### L1. Orphaned entries when refunded transaction is subsequently deleted

**File:** `src/db/queries/transactions.ts:150-170`

Deleting a refunded transaction does not delete the negative overhead entry that was created during the refund. Since the original transaction had status='refunded' on delete, stock is not re-restored (correct), but the negative overhead orphan remains forever.

---

### L2. `roundPrice` minimum of 100 Poisha silently applied

**File:** `src/lib/math/rounding.ts:7`

`roundPrice` floors at 100 Poisha (1 Taka). A user entering 0.01 Taka in TransactionForm or SellSheet: the validated amount becomes 1.00 Taka with no user notification. The error message says "must be a positive number" — it accepts 0.01 but silently transforms it to 1.00.

---

### L3. `roundStock` silences negative quantities to 0

**File:** `src/lib/math/rounding.ts:2`

`roundStock(-5) = 0`. In `createShipmentTransaction` and `updateShipment`, there's no validation rejecting negative quantities — they silently become 0. This creates zero-quantity inventory items that clutter the UI.

---

### L4. No cross-validation that wholesaleCost ≤ trueCost

**File:** `src/db/queries/shipments.ts` (entire file)

The allocator guarantees `trueCost = roundPrice(wholesaleCost + perUnitFee)`, so trueCost should always be ≥ wholesaleCost. But if `roundPrice` rounds down (e.g., wholesaleCost=10500, perUnitFee=0, roundPrice(10500)=11000, trueCost=11000 > 10500) — actually it's always ≥. But there's no assertion or validation enforcing this invariant.

---

### L5. Backup format has no version validation

**File:** `src/lib/backup/backup.ts:17-24`

The backup JSON includes `"version": 1` but `importDbFromJson` never checks it. A future schema change could produce a v2 backup that the v1 restore silently misinterprets.

---

### L6. `formatCurrency` displays negative values as `-৳500` (minus before symbol)

**File:** `src/lib/math/rounding.ts:10-13`

Style preference only. `-৳500` vs `৳-500` vs `(৳500)` — the current output is unusual for South Asian currency conventions.

---

### L7. Chart Y-axis labels display in hundreds of Taka without unit indicator

**File:** `src/components/ReportsView.tsx:181-192`

Y-axis values show `৳{value / 100}` but the values are in 100s of Taka (divided by 100 from chartMax). `chartMax` is in Poisha, and the labels divide by 100 (converting to Taka). But there's no "×100 Taka" annotation — the suffix `k` is missing for larger values. A chart max of 200000 Poisha (2000 Taka) shows `৳20` on the top line, which could be misinterpreted as 20 Taka.

---

### L8. "Safety Pocket" Dashboard card description is accurate but compared to target that uses the same scale

**File:** `src/components/DashboardView.tsx:59`, `src/components/DashboardView.tsx:241`

**Note:** Verified correct. `metrics.safetyPocket` is in Poisha, `safetyPocketTarget` is stored as Poisha (`pocketVal * 100`). The comparison and display are consistent.

---

## LABEL-ACCURACY VERIFICATION TABLE

Every labeled metric in the app traced to its actual computation:

| UI Label | File | Actual Calculation | Accurate? |
|----------|------|-------------------|-----------|
| "Tailoring Net" | DashboardView.tsx:35-39 | tailoringIncome − tailoringExpense | ✅ |
| "Clothing Net" | DashboardView.tsx:41-46 | clothingIncome − clothingOverhead | ✅ |
| "Total Business Profit" | DashboardView.tsx:48-54 | (tailorNet + clothingNet) | ✅ (label) ⚠️ (desc says "income") |
| "Safety Pocket" | DashboardView.tsx:55-61 | totalBusinessProfit − personalExpense | ✅ |
| "Inflow vs Outflow" | ReportsView.tsx:111-124 | In=tailor+clothing income, Out=all expenses+personal | ✅ |
| "Actual Retail Margin" | ReportsView.tsx:127-139 | (clothingRev − clothingCost) / clothingRev | ✅ |
| "Target Price Meet Rate" | ReportsView.tsx:142-156 | % of clothing sales meeting preferred price | ⚠️ (see M2) |
| "Monthly Sales" | ReportsView.tsx:240 | tailoring_income + clothing_income | ✅ |
| "Monthly Net Business Profit" | ReportsView.tsx:244 | sales − (tailoring_expense + clothing_overhead) | ✅ |
| "Business Net" (table) | ReportsView.tsx:269,286 | same as Net Business Profit | ✅ |
| "Clothing Margin" (table) | ReportsView.tsx:270,288 | (clothingRev − clothingCost) / clothingRev × 100 | ✅ |

---

## COMPLETE CODE PATH AUDIT

### Transaction Lifecycle

```
CREATE (insertTransaction)
  ├── amount = roundPrice(unit_price × 100) × quantity (clothing_income)
  │   or amount = roundPrice(unit_price × 100) (other categories)
  ├── stock decremented for clothing_income
  └── stored as total, not unit price ✅

READ (getTransactions)
  └── retrieves all columns ✅

EDIT (updateTransaction)
  ├── stock adjustment: diff-based for same-item, full swap for different-item ✅
  ├── handles wasActive→isNotActive (restore stock) ✅
  └── handles wasNotActive→isActive (decrement stock) ⚠️ (doesn't clean refund reversal — see H2)

REFUND (refundTransaction)
  ├── status → 'refunded' ✅
  ├── stock restored ✅
  └── courier reversal: -perUnitFee ⚠️ (should be -perUnitFee × qty — see H1)

DELETE (deleteTransaction)
  ├── stock restored for active sales ✅
  └── no-op for refunded (correct) ✅
```

### Shipment Lifecycle

```
CREATE (createShipmentTransaction)
  ├── courier fee logged as clothing_overhead ✅
  ├── items inserted with roundPrice'd costs ⚠️ (10-Taka granularity — see H3)
  └── courierTransactionId stored on shipment ✅

EDIT (updateShipment)
  ├── courier fee transaction updated/created/deleted ✅
  ├── existing item quantities: initialQuantity frozen ⚠️ (see C3)
  ├── new items: initialQuantity = quantity ✅
  └── trueCost user-editable, no historical snapshot ⚠️ (see C2)

DELETE (deleteShipment)
  ├── courier transaction deleted ✅
  ├── items cascade-deleted ❌ (FK not enforced — see C4)
  ├── items actually: orphaned with dangling shipmentId ❌ (see C4b)
  └── transactions keep inventoryItemId (no SET NULL without FK) — both good and bad
```

### Reporting Chain

```
fetchAggregatedMetrics (Dashboard)
  ├── sums by category WHERE status='active' ✅
  ├── tailoringNet = income − expense ✅
  ├── clothingNet = income − overhead ✅
  ├── totalBusinessProfit = tailoringNet + clothingNet ✅
  ├── safetyPocket = totalBusinessProfit − personalExpense ✅
  └── inv metrics: initialQuantity − quantity ⚠️ (see C3 when initialQuantity stale)

ReportsView monthly grouping
  ├── filters active transactions only ✅
  ├── sales = tailoring_income + clothing_income ✅
  ├── expenses = tailoring_expense + clothing_overhead ✅
  ├── profit = sales − expenses (personal excluded) ✅
  └── clothingCost = item.trueCost × quantity ⚠️ (uses current trueCost, see C2)
```

---

## EDGE CASES NOT HANDLED

1. **Concurrent edits**: No locking mechanism. Two tabs editing the same shipment could cause lost updates.

2. **Sale of item with zero quantity**: `insertTransaction` checks `item.quantity < qty` and throws. QuantityInput enforces min=1. Protected ✅. But direct DB manipulation could bypass this.

3. **Refunding already-refunded transaction**: Caught by explicit check (`status === 'refunded'`) ✅.

4. **Deleting item that has sales**: FK `ON DELETE SET NULL` not enforced without PRAGMA ⚠️ (see C4).

5. **Shipment deletion does not clean up inventory items**: `deleteShipment` misses manual item cleanup ⚠️ (see C4b).

6. **Restoring backup with different schema version**: No version check ⚠️ (see L5).

6. **Shipment with zero total quantity**: `calculateOptionA` throws "Total units must be greater than zero" ✅.

7. **Negative courier fee**: `parsedFee < 0` throws in handleSave ✅. But `parseFloat("abc")` = NaN, caught by `isNaN(parsedFee)` ✅.

---

## RECOMMENDED FIX PRIORITY

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | C1 — Backup restore data loss | Small | All restore operations corrupt data |
| P0 | C2 — Shipment edit rewrites history | Medium | All financial reports unreliable after edit |
| P0 | C3 — Stock edit breaks sold count | Small | Dashboard metrics wrong after edit |
| P0 | C4 — Missing PRAGMA foreign_keys | Trivial | All FK constraints silently ignored |
| P0 | C4b — Shipment delete orphans items | Medium | Items survive with dangling shipmentId |
| P1 | H1 — Refund reversal wrong for multi-qty | Small | Systematic financial error on multi-unit refunds |
| P1 | H2 — Reactivate refunded leaves orphan | Medium | Manual cleanup needed |
| P1 | H3 — 10-Taka cost precision loss | Medium | Cumulative cost tracking error |
| P2 | M1 — Misleading "income" description | Trivial | User confusion |
| P2 | M2 — Meet-rate KPI bypass | Small | KPI inflated |
| P3 | All low issues | Various | Minor correctness/UX |

---

## VERDICT

**Label accuracy is high.** After tracing every metric to its computation, all labels correctly describe what they calculate, with one exception: "Total Business Profit" having description "Combined business income" (M1).

**The serious problems are in data integrity during mutations** — editing shipments, deleting shipments, refunding, restoring backups, and the missing FK pragma all have bugs that silently corrupt financial or inventory data. The backup/restore module is the most broken (C1 — 4 columns not restored).

**Compounding issue:** Without `PRAGMA foreign_keys = ON` (C4), every FK-based integrity guarantee is absent. Combined with C1 (backup drops columns) and C2 (edits rewrite history), the long-term accuracy of financial reports depends entirely on the operator never performing mutations — which contradicts the app's edit/delete/refund feature set.

In production, issues C1-C4b and H1-H2 guarantee that financial reports will diverge from reality within a few edit/delete/refund cycles.
