# Number Format & DB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip `.00` from Taka currency displays and add missing `customer_name` + `notes` column migrations.

**Architecture:** Add shared `formatCurrency()` to `src/lib/math/rounding.ts`, replace 3 duplicated local `formatCurrency` definitions with import, replace 22 inline `.toFixed(2)` currency calls. Add ALTER TABLE migrations in `db/client.ts`.

**Tech Stack:** React 19, TypeScript 6, Vitest, wa-sqlite

---

### Task 1: Add shared `formatCurrency` utility + tests

**Files:**
- Modify: `src/lib/math/rounding.ts`
- Create: `src/lib/math/rounding.test.ts`

- [ ] **Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { formatCurrency, roundStock, roundPrice } from './rounding';

describe('formatCurrency', () => {
  it('formats whole Taka without decimals', () => {
    expect(formatCurrency(10000)).toBe('৳100');
    expect(formatCurrency(0)).toBe('৳0');
    expect(formatCurrency(5000)).toBe('৳50');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-50000)).toBe('-৳500');
  });

  it('rounds fractional Poisha to nearest Taka', () => {
    // Defensive: should round even if non-round values appear
    expect(formatCurrency(10050)).toBe('৳101');
    expect(formatCurrency(10049)).toBe('৳100');
  });
});

describe('roundStock', () => {
  it('rounds to nearest integer, min 0', () => {
    expect(roundStock(4.7)).toBe(5);
    expect(roundStock(-5)).toBe(0);
  });
});

describe('roundPrice', () => {
  it('rounds to nearest 10 Taka, min 100 Poisha', () => {
    expect(roundPrice(62000)).toBe(62000);
    expect(roundPrice(61500)).toBe(62000);
    expect(roundPrice(50)).toBe(100);
  });
});
```

- [ ] **Run tests to verify they fail**

Run: `npx vitest run src/lib/math/rounding.test.ts`
Expected: FAIL — `formatCurrency` not exported

- [ ] **Add `formatCurrency` to `rounding.ts`**

```typescript
export function formatCurrency(amountInPoisha: number): string {
  const taka = Math.round(amountInPoisha / 100);
  const sign = taka < 0 ? '-' : '';
  return `${sign}৳${Math.abs(taka)}`;
}
```

- [ ] **Run tests to verify they pass**

Run: `npx vitest run src/lib/math/rounding.test.ts`
Expected: PASS

- [ ] **Commit**

```bash
git add src/lib/math/rounding.ts src/lib/math/rounding.test.ts
git commit -m "feat: add formatCurrency() utility without decimal places"
```

---

### Task 2: Replace formatCurrency in DashboardView.tsx

**Files:**
- Modify: `src/components/DashboardView.tsx`

- [ ] **Remove local `formatCurrency` (lines 22-27) and add import**

Replace:
```typescript
  // Format Poisha to Taka helper
  const formatCurrency = (amountInPoisha: number) => {
    const taka = amountInPoisha / 100;
    const sign = taka < 0 ? '-' : '';
    return `${sign}৳${Math.abs(taka).toFixed(2)}`;
  };
```
With import (add to existing import from `../lib/math/pricing`):
```typescript
import { calculatePreferredPrice } from '../lib/math/pricing';
import { formatCurrency } from '../lib/math/rounding';
```

- [ ] **Replace inline `.toFixed(2)` currency calls (lines 330-332)**

Replace:
```typescript
<strong className="text-black font-extrabold">৳{(item.wholesaleCost / 100).toFixed(2)}</strong>
<strong className="text-green-600 font-extrabold">৳{(item.trueCost / 100).toFixed(2)}</strong>
<strong className="text-purple-600 font-extrabold">৳{(preferredPrice / 100).toFixed(2)}</strong>
```
With:
```typescript
<strong className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</strong>
<strong className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</strong>
<strong className="text-purple-600 font-extrabold">{formatCurrency(preferredPrice)}</strong>
```

- [ ] **Run tests to ensure nothing broke**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/components/DashboardView.tsx
git commit -m "refactor: use shared formatCurrency in DashboardView"
```

---

### Task 3: Replace formatCurrency in ReportsView.tsx

**Files:**
- Modify: `src/components/ReportsView.tsx`

- [ ] **Remove local `formatCurrency` (lines 12-17) and add import**

Replace:
```typescript
  // Format Poisha to Taka helper
  const formatCurrency = (amountInPoisha: number) => {
    const taka = amountInPoisha / 100;
    const sign = taka < 0 ? '-' : '';
    return `${sign}৳${Math.abs(taka).toFixed(2)}`;
  };
```
With import change:
```typescript
import { calculatePreferredPrice, calculateProfitMargin } from '../lib/math/pricing';
import { formatCurrency } from '../lib/math/rounding';
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/components/ReportsView.tsx
git commit -m "refactor: use shared formatCurrency in ReportsView"
```

---

### Task 4: Replace formatCurrency in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Remove local `formatCurrency` (lines 295-300) and add import**

Replace:
```typescript
  const formatCurrency = (amountInPoisha: number, category?: string) => {
    const taka = amountInPoisha / 100;
    const isExpense = category && expenseCategories.has(category);
    const sign = isExpense ? '-' : taka < 0 ? '-' : '';
    return `${sign}৳${Math.abs(taka).toFixed(2)}`;
  };
```
Add import:
```typescript
import { formatCurrency } from './lib/math/rounding';
```

Change the `formatCurrency` call sites that pass `category` as second arg. The expense sign is handled by the caller in the `expenseCategories` check already present in the template (line 593). So just use `formatCurrency(record.amount)` instead of `formatCurrency(record.amount, record.category)` — the expense sign is already applied via the ternary on line 593 (`expenseCategories.has(record.category) ? 'text-red-600' : 'text-black'`).

- [ ] **Replace inline `.toFixed(2)` calls (lines 725, 729, 733)**

Replace:
```typescript
৳{(item.wholesaleCost / 100).toFixed(2)}
৳{(item.trueCost / 100).toFixed(2)}
৳{(preferredPrice / 100).toFixed(2)}
```
With:
```typescript
{formatCurrency(item.wholesaleCost)}
{formatCurrency(item.trueCost)}
{formatCurrency(preferredPrice)}
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/App.tsx
git commit -m "refactor: use shared formatCurrency in App"
```

---

### Task 5: Replace inline `.toFixed(2)` in SellSheet.tsx

**Files:**
- Modify: `src/components/SellSheet.tsx`

- [ ] **Add `formatCurrency` import**

Add to existing `rounding` import line:
```typescript
import { roundPrice, formatCurrency } from '../lib/math/rounding';
```

- [ ] **Replace line 33** — `setRetailPriceStr((preferredPrice / 100).toFixed(2))`

```typescript
setRetailPriceStr(`${Math.round(preferredPrice / 100)}`);
```

- [ ] **Replace lines 111, 115, 119** — inline `.toFixed(2)` in JSX

Replace:
```typescript
<span className="text-black font-extrabold">৳{(item.wholesaleCost / 100).toFixed(2)}</span>
<span className="text-green-600 font-extrabold">৳{(item.trueCost / 100).toFixed(2)}</span>
<span className="text-purple-600 font-extrabold">৳{(preferredPrice / 100).toFixed(2)}</span>
```
With:
```typescript
<span className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</span>
<span className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</span>
<span className="text-purple-600 font-extrabold">{formatCurrency(preferredPrice)}</span>
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/components/SellSheet.tsx
git commit -m "refactor: use shared formatCurrency in SellSheet"
```

---

### Task 6: Replace inline `.toFixed(2)` in ShipmentForm.tsx

**Files:**
- Modify: `src/components/ShipmentForm.tsx`

- [ ] **Add `formatCurrency` import**

```typescript
import { formatCurrency } from '../lib/math/rounding';
```

- [ ] **Replace line 35** — `setCourierFeeStr((shipment.courierFee / 100).toFixed(2))`

```typescript
setCourierFeeStr(`${Math.round(shipment.courierFee / 100)}`);
```

- [ ] **Replace line 45** — `wholesaleCostStr: (item.wholesaleCost / 100).toFixed(2)`

```typescript
wholesaleCostStr: `${Math.round(item.wholesaleCost / 100)}`
```

- [ ] **Replace line 260** — `৳{(previewTrueCost / 100).toFixed(2)}`

```typescript
{formatCurrency(previewTrueCost)}
```

- [ ] **Replace line 421** — `৳${(trueCost / 100).toFixed(2)}`

```typescript
{formatCurrency(trueCost)}
```

- [ ] **Replace lines 207, 213** — `.toFixed(0)` currency displays

These are already showing integer values (`.toFixed(0)`), but should use `formatCurrency` for consistency:
```typescript
// Line 207: ৳{cost.toFixed(0)}
{formatCurrency(Math.round(cost * 100))}
// Line 213: ৳{(trueCost / 100).toFixed(0)}
{formatCurrency(trueCost)}
```

Wait — lines 207 and 213 use `cost.toFixed(0)` where `cost` is already in Taka (from `parseFloat(line.wholesaleCostStr)`). So `formatCurrency(Math.round(cost * 100))` would convert Taka → Poisha → format. That's unnecessarily roundabout. Keep these as-is since they're `.toFixed(0)` (already whole numbers) and the spec says "leave non-currency `.toFixed(0)` alone".

Actually, these ARE currency displays (wholesale cost per unit in collapsed rows). Convert to Poisha and use formatCurrency:
```typescript
{formatCurrency(Math.round(cost * 100))}
{formatCurrency(trueCost)}
```

- [ ] **Replace lines 416, 459, 463** — `.toFixed(2)` on wholesale/courier summaries

Line 416: `cost.toFixed(2)` — `cost` is wholesale cost per unit in Taka (from `parseFloat`). Replace with:
```typescript
{formatCurrency(Math.round(cost * 100))}
```

Line 459: `totalWholesalePrice.toFixed(2)` — `totalWholesalePrice` is in Taka (sum of qty * cost). Replace with:
```typescript
{formatCurrency(Math.round(totalWholesalePrice * 100))}
```

Line 463: `parseFloat(courierFeeStr || '0').toFixed(2)` — courier fee in Taka. Replace with:
```typescript
{formatCurrency(Math.round(parseFloat(courierFeeStr || '0') * 100))}
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/components/ShipmentForm.tsx
git commit -m "refactor: use shared formatCurrency in ShipmentForm"
```

---

### Task 7: Replace inline `.toFixed(2)` in TransactionForm.tsx

**Files:**
- Modify: `src/components/TransactionForm.tsx`

- [ ] **Add `formatCurrency` import**

```typescript
import { roundPrice, formatCurrency } from '../lib/math/rounding';
```

- [ ] **Replace line 59** — `setAmountStr((transaction.amount / 100).toFixed(2))`

```typescript
setAmountStr(`${Math.round(transaction.amount / 100)}`);
```

- [ ] **Replace line 262** — `setAmountStr((preferredPrice / 100).toFixed(2))`

```typescript
setAmountStr(`${Math.round(preferredPrice / 100)}`);
```

- [ ] **Replace line 264** — `৳${(selectedItem.trueCost / 100).toFixed(2)}`

```typescript
{formatCurrency(selectedItem.trueCost)}
```

- [ ] **Replace line 276** — `Pref: ৳${(preferredPrice / 100).toFixed(2)}`

```typescript
Pref: ${formatCurrency(preferredPrice)}
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "refactor: use shared formatCurrency in TransactionForm"
```

---

### Task 8: Replace inline `.toFixed(2)` in inventory.ts query

**Files:**
- Modify: `src/db/queries/inventory.ts`

- [ ] **Add `formatCurrency` import**

```typescript
import { roundPrice, formatCurrency } from '../../lib/math/rounding';
```

- [ ] **Replace line 36** — description string with `.toFixed(2)`

Replace:
```typescript
const description = `Sale: ${item.brand} (Cost: ৳${(item.trueCost / 100).toFixed(2)})`;
```
With:
```typescript
const description = `Sale: ${item.brand} (Cost: ${formatCurrency(item.trueCost)})`;
```

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Commit**

```bash
git add src/db/queries/inventory.ts
git commit -m "refactor: use shared formatCurrency in inventory query"
```

---

### Task 9: Add DB migration for missing `customer_name` and `notes` columns

**Files:**
- Modify: `src/db/client.ts`

- [ ] **Add migration blocks after existing `inventory_item_id` migration (after line 90)**

```typescript
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
```

- [ ] **Commit**

```bash
git add src/db/client.ts
git commit -m "fix: add migration for missing customer_name and notes columns"
```
