# Business Logic Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 15+ data integrity, accounting, and presentation issues from the business logic review.

**Architecture:** All fixes are in existing files — `src/db/client.ts`, `src/db/queries/shipments.ts`, `src/db/queries/transactions.ts`, `src/db/queries/inventory.ts`, `src/lib/backup/backup.ts`, `src/lib/math/rounding.ts`, `src/components/SellSheet.tsx`, `src/components/ReportsView.tsx`, `src/components/DashboardView.tsx`.

**Tech Stack:** TypeScript, SQLite (wa-sqlite), Drizzle ORM, React

---

### Task 1: Enable PRAGMA foreign_keys and fix deleteShipment (C4, C4b)

**Files:**
- Modify: `src/db/client.ts:47`
- Modify: `src/db/queries/shipments.ts:70-81`

- [ ] **Step 1: Add PRAGMA foreign_keys = ON after opening database**

In `src/db/client.ts`, after line 47 (`rawDbPtr = dbPtr;`), add:

```typescript
await sqlite3.exec(dbPtr, 'PRAGMA foreign_keys = ON;');
```

- [ ] **Step 2: Add linked-sales check in deleteShipment**

In `src/db/queries/shipments.ts`, add to `deleteShipment`, before deleting courier transaction:

```typescript
export async function deleteShipment(shipmentId: number): Promise<void> {
  const db = getDb();
  return await db.transaction(async (tx: any) => {
    const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId));

    // Check for linked sales before allowing deletion
    const items = await tx.select().from(inventoryItems).where(eq(inventoryItems.shipmentId, shipmentId));
    for (const item of items) {
      const [sale] = await tx.select().from(transactions)
        .where(eq(transactions.inventoryItemId, item.id))
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

    // Delete all inventory items (safe — checked above that none have sales)
    for (const item of items) {
      await tx.delete(inventoryItems).where(eq(inventoryItems.id, item.id));
    }

    await tx.delete(shipments).where(eq(shipments.id, shipmentId));
  });
}
```

- [ ] **Step 3: Run build to verify no type errors**

Run: `npx tsc --noEmit 2>&1` or check with `npm run typecheck` if available

---

### Task 2: Fix backup restore missing columns (C1)

**File:**
- Modify: `src/lib/backup/backup.ts:46-83`

- [ ] **Step 1: Fix shipment restore — add courierTransactionId**

Replace the shipments insert block:

```typescript
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
```

- [ ] **Step 2: Fix inventory item restore — add initialQuantity**

Replace the inventory items insert block:

```typescript
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
```

- [ ] **Step 3: Fix transaction restore — add quantity, customerName, notes**

Replace the transactions insert block:

```typescript
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
```

---

### Task 3: Add backup version validation (L5)

**File:**
- Modify: `src/lib/backup/backup.ts:32-36`

- [ ] **Step 1: Add version check at start of importDbFromJson**

After `const data = JSON.parse(jsonStr);`:

```typescript
const SUPPORTED_VERSION = 1;
if (data.version && data.version > SUPPORTED_VERSION) {
  throw new Error(
    `Backup version ${data.version} is not supported. Current supported version: ${SUPPORTED_VERSION}.`
  );
}
```

---

### Task 4: Add shipment edit validations — trueCost and quantity (C2, C3, L4)

**File:**
- Modify: `src/db/queries/shipments.ts:107-132`

- [ ] **Step 1: Add trueCost/wholesaleCost change check (C2) and quantity increase check (C3) and cost invariant (L4)**

Replace the existing item edit block (lines 107-131) with:

```typescript
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
      .where(eq(transactions.inventoryItemId, item.id))
      .limit(1);
    if (linkedSale) {
      if (roundPrice(item.wholesaleCost) !== existing.wholesaleCost ||
          roundPrice(item.trueCost) !== existing.trueCost) {
        throw new Error(
          `Cannot change costs on "${item.brand}" (ID ${item.id}): linked sales exist. ` +
          `Create a new shipment for updated pricing.`
        );
      }
    }

    // L4: Validate wholesaleCost ≤ trueCost
    const newWholesaleCost = roundPrice(item.wholesaleCost);
    const newTrueCost = roundPrice(item.trueCost);
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
    const newWholesaleCost = roundPrice(item.wholesaleCost);
    const newTrueCost = roundPrice(item.trueCost);
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
```

---

### Task 5: Remove roundPrice from cost fields in createShipmentTransaction (H3)

**File:**
- Modify: `src/db/queries/shipments.ts:37-44`

- [ ] **Step 1: Replace `roundPrice` with `Math.round` for cost fields**

In `createShipmentTransaction`, change the insert block:

```typescript
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
```

---

### Task 6: Fix refund reversal amount and cleanup (H1, H2, M6, L1)

**File:**
- Modify: `src/db/queries/transactions.ts:67-147` (updateTransaction)
- Modify: `src/db/queries/transactions.ts:196-204` (refundTransaction)
- Modify: `src/db/queries/transactions.ts:150-170` (deleteTransaction)

- [ ] **Step 1: Fix H1 — multiply reversal by quantity in refundTransaction**

In `refundTransaction`, change the reversal creation:

```typescript
const courierFeePerUnit = item.trueCost - item.wholesaleCost;
await tx.insert(transactions).values({
  amount: -(courierFeePerUnit * qty),
  category: 'clothing_overhead',
  description: `Refund courier fee reversal for transaction #${id}`,
  createdAt: new Date(),
  status: 'active'
});
```

Note: The `> 0` guard is removed (M6 fix) — if courierFeePerUnit is 0, the reversal is 0 which is a no-op.

- [ ] **Step 2: Add helper to find and clean up reversal entries**

Add a helper function after `deleteTransaction`:

```typescript
async function cleanupRefundReversal(tx: any, transactionId: number): Promise<void> {
  const [reversal] = await tx.select().from(transactions)
    .where(eq(transactions.description, `Refund courier fee reversal for transaction #${transactionId}`))
    .limit(1);
  if (reversal) {
    await tx.delete(transactions).where(eq(transactions.id, reversal.id));
  }
}
```

- [ ] **Step 3: Fix H2 — clean up reversal when refunded→active**

In `updateTransaction`, before the final update, add:

```typescript
// H2: If reactivating a refunded transaction, clean up reversal
if (oldTx.status === 'refunded' && data.status === 'active') {
  await cleanupRefundReversal(tx, id);
}
```

Insert this after the stock-adjustment logic (after line 131) and before the transaction update.

- [ ] **Step 4: Fix L1 — clean up reversal when deleting refunded transaction**

In `deleteTransaction`, before the delete, add:

```typescript
// L1: Clean up reversal when deleting refunded transaction
if (oldTx.status === 'refunded') {
  await cleanupRefundReversal(tx, id);
}
```

Insert after the active-sale stock restoration block (after line 165).

---

### Task 7: Fix formatCurrency negative display (H4/L6)

**File:**
- Modify: `src/lib/math/rounding.ts:10-13`

- [ ] **Step 1: Change minus sign placement**

```typescript
export function formatCurrency(amountInPoisha: number): string {
  const taka = Math.round(amountInPoisha / 100);
  const abs = Math.abs(taka);
  return taka < 0 ? `৳-${abs}` : `৳${abs}`;
}
```

---

### Task 8: Fix DashboardView description mismatch (M1)

**File:**
- Modify: `src/components/DashboardView.tsx:53`

- [ ] **Step 1: Fix description text**

Change line 53 from:

```typescript
description: 'Combined business income'
```

to:

```typescript
description: 'Net profit from all business operations'
```

---

### Task 9: Fix meet-rate KPI — exclude unlinked transactions (M2)

**File:**
- Modify: `src/components/ReportsView.tsx:43-49`

- [ ] **Step 1: Change filtering logic**

Replace the `salesMeetingTarget` filter:

```typescript
const salesMeetingTarget = clothingSales.filter(t => {
  if (!t.inventoryItemId) return false;
  const item = itemMap.get(t.inventoryItemId);
  if (!item) return false;
  const targetUnitPrice = calculatePreferredPrice(item.trueCost, targetMarkup);
  return t.amount >= targetUnitPrice * (t.quantity ?? 1);
});

// Also exclude unlinked from denominator
const validClothingSales = clothingSales.filter(t => t.inventoryItemId && itemMap.has(t.inventoryItemId));
const meetRate = validClothingSales.length > 0
  ? (salesMeetingTarget.length / validClothingSales.length) * 100
  : 0;
```

---

### Task 10: Fix double roundPrice in SellSheet (M3)

**Files:**
- Modify: `src/components/SellSheet.tsx:51-52`
- Modify: `src/db/queries/inventory.ts:36`

- [ ] **Step 1: Remove outer roundPrice in SellSheet**

In `SellSheet.tsx`, change:

```typescript
const scaledPrice = Math.round(parsedPrice * 100);
const roundedPrice = roundPrice(scaledPrice);
```

to:

```typescript
const roundedAmount = roundPrice(Math.round(parsedPrice * 100));
```

Then change the sales call from:
```typescript
await executeProductSale(item.id, roundedPrice * quantity, note, customerName, quantity);
```
to:
```typescript
await executeProductSale(item.id, roundedAmount * quantity, note, customerName, quantity);
```

- [ ] **Step 2: Fix executeProductSale to not double-round**

In `src/db/queries/inventory.ts`, change:

```typescript
amount: roundPrice(retailPrice),
```

to:

```typescript
amount: retailPrice,
```

The caller already passes a properly rounded value.

---

### Task 11: Fix dead migration logic (M4)

**File:**
- Modify: `src/db/client.ts:142`

- [ ] **Step 1: Change default to false**

Change line 142 from:

```typescript
let alreadyMigrated = true;
```

to:

```typescript
let alreadyMigrated = false;
```

---

### Task 12: Add validation for negative quantities and sub-1-Taka prices (L2, L3)

**Files:**
- Modify: `src/lib/math/rounding.ts:1-3`
- Modify: `src/components/SellSheet.tsx:54-56`
- Modify: `src/components/TransactionForm.tsx:99-103`

- [ ] **Step 1: Add explicit validation error for negative roundStock**

Replace `roundStock` with a function that validates:

```typescript
export function roundStock(value: number): number {
  if (value < 0) {
    throw new Error('Quantity cannot be negative.');
  }
  return Math.round(value);
}
```

- [ ] **Step 2: Add minimum price validation in SellSheet**

After the existing validation:

```typescript
if (roundedAmount < 100) {
  throw new Error('Sale price must be at least 1 Taka (100 Poisha).');
}
```

- [ ] **Step 3: Add minimum price validation in TransactionForm**

After the existing validation:

```typescript
if (roundedAmount < 100) {
  throw new Error('Transaction amount must be at least 1 Taka (100 Poisha).');
}
```

---

### Task 13: Add chart axis unit annotation (L7)

**File:**
- Modify: `src/components/ReportsView.tsx:191`

- [ ] **Step 1: Add clarifying annotation to Y-axis**

After the `৳0` text element (around line 191), add:

```tsx
<text x="480" y="174" className="text-[8px] font-sans fill-slate-400" textAnchor="end">
  (Taka)
</text>
```

Also change the top label from:
```tsx
<text x="32" y="24" className="...text-right" textAnchor="end">
  ৳{((chartMax * 1.0) / 100).toFixed(0)}
</text>
```
to:
```tsx
<text x="32" y="24" className="...text-right" textAnchor="end">
  ৳{((chartMax * 1.0) / 100).toFixed(0)}
</text>
```
(this annotation is already in Taka, so no change needed, just add the "(Taka)" annotation)

---

### Task 14: Build and verify

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1`

Expected: No type errors.

- [ ] **Step 2: Run lint (if available)**

Run the project's lint command and verify no errors.

- [ ] **Step 3: Run tests (if available)**

Run the project's test command and verify all tests pass.

---

## Spec Coverage Check

| Requirement | Task |
|------------|------|
| C1 — Backup restore missing columns | Task 2 |
| C2 — Disallow trueCost edits on items with sales | Task 4 |
| C3 — Disallow quantity increases on existing items | Task 4 |
| C4 — Enable PRAGMA foreign_keys | Task 1 |
| C4b — Block shipment deletion with linked sales | Task 1 |
| H1 — Multiply refund reversal by quantity | Task 6 |
| H2 — Clean up reversal on reactivate | Task 6 |
| H3 — Remove roundPrice from cost fields | Task 5 |
| L4 — wholesaleCost ≤ trueCost validation | Task 4 |
| H4/L6 — formatCurrency minus placement | Task 7 |
| M1 — Fix DashboardView description | Task 8 |
| M2 — Fix meet-rate KPI | Task 9 |
| M3 — Fix double roundPrice | Task 10 |
| M4 — Fix dead migration | Task 11 |
| L2 — Minimum 1 Taka validation | Task 12 |
| L3 — Negative qty validation | Task 12 |
| L5 — Backup version check | Task 3 |
| L7 — Chart axis annotation | Task 13 |
| L1 — Clean up reversal on refunded delete | Task 6 |
