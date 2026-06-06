# Number Format: Remove Decimal `.00` from Taka Display

## Problem
All Taka amounts display with 2 decimal places (e.g. `৳100.00`) even though the app never produces fractional Taka values. `roundPrice()` rounds to nearest 10 Taka, so currency values are always whole numbers.

## Scope
- **Only** Taka currency displays — Poisha-to-Taka conversion with `.toFixed(2)`
- **Not** affected: percentage values (`.toFixed(0)` / `.toFixed(1)`), chart labels, locale-formatted stock counts, dates

## Design

### 1. Shared utility function
Add `formatCurrency(amountInPoisha: number): string` to `src/lib/math/rounding.ts`:

```ts
export function formatCurrency(amountInPoisha: number): string {
  const taka = Math.round(amountInPoisha / 100)
  const sign = taka < 0 ? '-' : ''
  return `${sign}৳${Math.abs(taka)}`
}
```

### 2. Remove 3 local `formatCurrency` definitions
Replace with import from `src/lib/math/rounding.ts`:
- `src/App.tsx` (lines 295-300)
- `src/components/DashboardView.tsx` (lines 23-27)
- `src/components/ReportsView.tsx` (lines 13-17)

### 3. Replace 22 inline `.toFixed(2)` currency calls
All instances of `(value / 100).toFixed(2)` used for currency display — replace with `formatCurrency(value)`:

| File | Count |
|------|-------|
| `src/App.tsx` | 3 |
| `src/components/DashboardView.tsx` | 3 |
| `src/components/SellSheet.tsx` | 4 |
| `src/components/ShipmentForm.tsx` | 4 |
| `src/components/TransactionForm.tsx` | 4 |
| `src/components/ReportsView.tsx` | 0 (uses formatCurrency which gets fixed) |
| `src/db/queries/inventory.ts` | 1 |

### 4. Edge cases
- **Negative values**: Handled by sign check (`taka < 0`)
- **Zero**: `formatCurrency(0)` → `৳0`
- **Fractions (defensive)**: `Math.round` ensures integer display even if non-round Poisha values somehow appear
