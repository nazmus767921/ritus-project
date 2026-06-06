# Implementation Plan: Stock Tracking, Math Refactoring & UI Redesign

## File Changes Overview

| # | File | Action |
|---|------|--------|
| 1 | `src/db/schema.ts` | Add `initialQuantity` column |
| 2 | `src/lib/math/rounding.ts` | **NEW** - Rounding utility functions |
| 3 | `src/db/queries/shipments.ts` | Apply rounding, pass `initialQuantity` |
| 4 | `src/db/queries/inventory.ts` | Apply rounding to `executeProductSale` |
| 5 | `src/lib/math/allocator.ts` | Round `trueCost` output to nearest 10 Taka |
| 6 | `src/lib/math/pricing.ts` | Round `calculatePreferredPrice` result to nearest 10 Taka |
| 7 | `src/components/ShipmentForm.tsx` | Apply rounding to quantity & wholesaleCost; ship `initialQuantity` |
| 8 | `src/components/TransactionForm.tsx` | Apply rounding to `amount`; redesign category buttons as grid |
| 9 | `src/components/SellSheet.tsx` | Apply rounding to retail price |
| 10 | `src/components/DashboardView.tsx` | Update badge to `[initial / remaining left]` format |
| 11 | `src/App.tsx` | No changes needed (select queries return all columns automatically) |

---

## Step 1: Add `initialQuantity` to Schema

**File:** `src/db/schema.ts`

Add `initialQuantity` column to the `inventoryItems` table after `quantity`:

```typescript
quantity: integer('quantity').notNull(),
initialQuantity: integer('initial_quantity').notNull(),
```

This tracks the original shipment quantity. `quantity` continues to decrement on sale; `initialQuantity` stays unchanged.

---

## Step 2: Create Rounding Utility

**File:** `src/lib/math/rounding.ts` (NEW)

Create two functions:

### `roundStock(value: number): number`
- Rounds to nearest whole integer
- Uses `Math.round()`
- Minimum value: `0`
- Used for: stock quantities before DB write

### `roundPrice(poishaValue: number): number`
- Rounds to nearest 10 Taka at the Taka level
- Algorithm: `Math.round(poishaValue / 1000) * 1000`
- Minimum value: `100` (floor at 1 Taka to prevent 0-cost items)
- Used for ALL price values before DB write: `wholesaleCost`, `trueCost`, `transaction.amount`, `retailPrice`, `preferredPrice`

Export both functions.

---

## Step 3: Update `allocator.ts`

**File:** `src/lib/math/allocator.ts`

Import `roundPrice` from the new rounding utility.

Apply `roundPrice()` to each `trueCost` value returned by `calculateOptionA`:

```typescript
return items.map(item => roundPrice(item.wholesaleCost + perUnitFee));
```

---

## Step 4: Update `pricing.ts`

**File:** `src/lib/math/pricing.ts`

Import `roundPrice` from the rounding utility.

Apply `roundPrice()` to the return value of `calculatePreferredPrice`:

```typescript
return roundPrice(Math.round(trueCost * (1 + Math.max(0, markup))));
```

---

## Step 5: Update `shipments.ts`

**File:** `src/db/queries/shipments.ts`

Import `roundStock` and `roundPrice` from the rounding utility.

### `createShipmentTransaction()`
When inserting inventory items, set `initialQuantity`:

```typescript
await tx.insert(inventoryItems).values({
  shipmentId: insertedShipment.id,
  brand: item.brand,
  quantity: roundStock(item.quantity),
  initialQuantity: roundStock(item.quantity), // Set once at creation
  wholesaleCost: roundPrice(item.wholesaleCost),
  trueCost: roundPrice(item.trueCost)
});
```

### `updateShipment()`
When updating inventory items:
- If updating existing item: preserve `initialQuantity` (do not overwrite)
- If inserting new item: set `initialQuantity = roundStock(item.quantity)`

For the update: fetch `initialQuantity` from existing row first, then preserve it:

```typescript
// When updating existing item
const existingQty = // fetch initialQuantity from DB
await tx.update(inventoryItems)
  .set({
    brand: item.brand,
    quantity: roundStock(item.quantity),
    initialQuantity: existingQty, // preserve
    wholesaleCost: roundPrice(item.wholesaleCost),
    trueCost: roundPrice(item.trueCost)
  })

// When inserting new item
await tx.insert(inventoryItems).values({
  ...
  quantity: roundStock(item.quantity),
  initialQuantity: roundStock(item.quantity),
  ...
})
```

---

## Step 6: Update `inventory.ts`

**File:** `src/db/queries/inventory.ts`

Import `roundPrice` from the rounding utility.

In `executeProductSale()`, apply `roundPrice()` to the `retailPrice` before inserting the transaction:

```typescript
const roundedPrice = roundPrice(retailPrice);
await tx.insert(transactions).values({
  amount: roundedPrice,
  ...
});
```

The stock quantity decrement (`item.quantity - 1`) stays as-is since it always operates on integers.

---

## Step 7: Update `ShipmentForm.tsx`

**File:** `src/components/ShipmentForm.tsx`

Import `roundPrice` and `roundStock` from the rounding utility.

### In `handleSave()`:
- For quantity: use `Math.round(parseFloat(line.quantityStr))` instead of `parseInt(line.quantityStr)`. This ensures proper rounding of float inputs to nearest integer. Do this before passing to the validated items.
- For wholesaleCost: after `Math.round(parseFloat(line.wholesaleCostStr) * 100)`, apply nothing here — the rounding to nearest 10 Taka will happen in `shipments.ts` (Step 5).

Wait — actually, the rounding should happen at the earliest point possible ("prior to database saving"). The form validates and passes data to the query function. The query function (shipments.ts) applies rounding right before DB write. This is correct because:
- The rounding happens in the query layer, not the UI layer
- All code paths (including future ones) that call these query functions will get rounded values

So no changes needed in ShipmentForm.tsx for rounding — the query layer handles it.

---

## Step 8: Update `TransactionForm.tsx`

**File:** `src/components/TransactionForm.tsx`

### Part A: Rounding
Import `roundPrice` from the rounding utility.

After computing `scaledAmount` in `handleSave()`, apply rounding:

```typescript
const parsedAmount = parseFloat(amountStr);
const scaledAmount = Math.round(parsedAmount * 100);
const roundedAmount = roundPrice(scaledAmount);
```

Then use `roundedAmount` everywhere instead of `scaledAmount`.

### Part B: Category Button Redesign
Replace the category selector section (lines 214-245) with a grid of square buttons.

**Current:** Vertical list of text buttons with checkmark.
**New:** Grid of square tappable buttons with large centered icons.

Import icons from `lucide-react`:

```typescript
import { Scissors, Shirt, Wallet, Package } from 'lucide-react';
```

Icon mapping:
| Category | Icon |
|---|---|
| `tailoring_income` | `Scissors` |
| `clothing_income` | `Shirt` |
| `personal_expense` | `Wallet` |
| `tailoring_expense` | `Scissors` |
| `clothing_overhead` | `Package` |

Add an icon config object at the top level of the component:

```typescript
const categoryIcons: Record<TransactionCategory, typeof Scissors> = {
  tailoring_income: Scissors,
  clothing_income: Shirt,
  personal_expense: Wallet,
  tailoring_expense: Scissors,
  clothing_overhead: Package,
};
```

Replace the category section JSX:

```tsx
<div className="space-y-2">
  <span className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider">
    Select Category
  </span>
  <div className="grid grid-cols-2 gap-3">
    {categoriesConfig[type].map((cat) => {
      const isSelected = category === cat.id;
      const IconComponent = categoryIcons[cat.id];
      return (
        <button
          key={cat.id}
          type="button"
          onClick={() => {
            setCategory(cat.id);
            if (cat.id !== 'clothing_income') setInventoryItemId(null);
          }}
          className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer min-h-[100px] ${
            isSelected
              ? 'bg-purple-100 border-black text-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'bg-white border-black text-slate-800 hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px]'
          }`}
        >
          <IconComponent className={`w-10 h-10 ${isSelected ? 'text-purple-700' : 'text-slate-600'}`} />
          <span className="text-[10px] font-sans font-bold text-center leading-tight px-1">
            {cat.label}
          </span>
        </button>
      );
    })}
  </div>
</div>
```

The selected state should show a visual indicator — either keep the check icon overlaid or use the purple background + icon color change.

---

## Step 9: Update `SellSheet.tsx`

**File:** `src/components/SellSheet.tsx`

Import `roundPrice` from the rounding utility.

In `handleSell()`, apply `roundPrice()` to the `scaledPrice` before passing to `executeProductSale`:

```typescript
const parsedPrice = parseFloat(retailPriceStr);
const scaledPrice = Math.round(parsedPrice * 100);
const roundedPrice = roundPrice(scaledPrice);
```

Then pass `roundedPrice` to `executeProductSale`.

---

## Step 10: Update `DashboardView.tsx`

**File:** `src/components/DashboardView.tsx`

### Part A: Props interface
Add `initialQuantity` to the inventory item type in the `DashboardViewProps` interface:

```typescript
inventoryItems: {
  id: number;
  brand: string;
  wholesaleCost: number;
  trueCost: number;
  quantity: number;
  initialQuantity: number;
}[];
```

### Part B: Badge logic
Replace the badge logic (lines 216-229) with the new format:

```typescript
let badgeClass = '';
let badgeLabel = '';
const isOutOfStock = item.quantity === 0;

if (isOutOfStock) {
  badgeClass = 'bg-red-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
  badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
} else if (item.quantity <= 3) {
  badgeClass = 'bg-yellow-300 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
  badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
} else {
  badgeClass = 'bg-green-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
  badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
}
```

The format: `[Initial / Remaining left]` — same format regardless of stock level.

---

## Step 11: Data Migration

Since this is a client-side SQLite database, existing data needs migration. The `inventory_items` table will have new rows with `initialQuantity`, but existing rows will not have this column.

### Migration approach:
Add a migration step that:
1. Checks if the `initial_quantity` column exists
2. If not, runs `ALTER TABLE inventory_items ADD COLUMN initial_quantity INTEGER NOT NULL DEFAULT 0`
3. Then updates all existing rows: `UPDATE inventory_items SET initial_quantity = quantity`

This should run during app startup, after `initDb()` succeeds, in `App.tsx`.

Alternatively, since wa-sqlite and drizzle don't have built-in migration support, run raw SQL:

```typescript
const db = getDb();
// Check if column exists (SQLite specific)
const columns = db.all("PRAGMA table_info('inventory_items')") as any[];
const hasInitialQty = columns.some((col: any) => col.name === 'initial_quantity');
if (!hasInitialQty) {
  db.run("ALTER TABLE inventory_items ADD COLUMN initial_quantity INTEGER NOT NULL DEFAULT 0");
  db.run("UPDATE inventory_items SET initial_quantity = quantity");
}
```

Place this in `src/db/client.ts` after `initDb()` or in `App.tsx` after `initDb()` resolves.

---

## Acceptance Criteria Verification

1. **Metrics badge:** Open Dashboard page → verify each stock item card shows `[initial / remaining left]` format
2. **Price rounding:** Create a transaction with amount like `6.27` → verify it saves as `6.30` Taka (630 Poisha)
3. **Category buttons:** Open "New Transaction" → verify categories show as 2-column grid of square buttons with large centered icons
4. **Stock rounding:** Import a shipment with quantity `10.7` → verify it saves as `11`
5. **No floats in UI:** Scan all price displays — they should all end in `0`
