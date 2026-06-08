# Business Logic Fixes — Design Document

> **Date:** 2026-06-07
> **Based on:** `docs/business-logic-review.md`
> **Scope:** Fix all data integrity, accounting, and presentation issues identified in the review

---

## Decisions Made

| Issue | Decision | Rationale |
|-------|----------|-----------|
| C1 | Include all columns in backup restore INSERTs | Data IS in JSON, just ignored — trivial fix |
| C2 | Disallow trueCost/wholesaleCost edits on items with sales | Simpler than costAtSale; user chose restrictive |
| C3 | Disallow increasing quantity on existing items | User chose restrictive approach |
| C4 | Enable PRAGMA foreign_keys = ON | FK constraints should work as declared |
| C4b | Block shipment deletion when linked sales exist | Prevents orphaned items AND broken COGS |
| H1 | Multiply reversal by quantity | Simple arithmetic fix |
| H2 | Clean up reversal when refunded→active | Delete reversal entry on status change back |
| H3 | Remove roundPrice from cost fields | Store raw Poisha for precision |
| M5 | Accept 1-Poisha rounding discrepancy | Negligible, not worth complexity |
| M6 | Remove guard, always attempt reversal | Zero-amount reversal is no-op, consistent |
| M7 | Accept negative overhead approach | Valid accounting pattern (reversal-based) |
| M1 | Fix description text | "income" → "profit" description |
| M2 | Exclude unlinked txs from meet-rate | Prevents KPI inflation |
| M3 | Remove outer roundPrice in SellSheet | Match TransactionForm behavior |
| H4/L6 | formatCurrency: minus after symbol | Bengali locale convention |
| L2 | Add validation for < 1 Taka entries | Reject instead of silently flooring |
| L3 | Add validation for negative quantities | Reject instead of silently clamping to 0 |
| L7 | Add unit annotation to chart axis | Clarify scale for users |
| M4 | Fix migration dead code | alreadyMigrated defaults to false |
| L1 | Clean up reversal on refunded delete | Same pattern as H2 |
| L4 | Add wholesaleCost ≤ trueCost assertion | Enforce invariant |

---

## Files Modified

| File | Changes |
|------|---------|
| `src/db/client.ts:47` | Add `PRAGMA foreign_keys = ON` |
| `src/db/client.ts:142` | Fix `alreadyMigrated = true` → `false` |
| `src/lib/math/rounding.ts:10-13` | Fix `formatCurrency` minus placement |
| `src/lib/math/rounding.ts:2-3` | Remove `roundStock` — add validation instead |
| `src/lib/math/rounding.ts:5-8` | Keep `roundPrice` but document intent |
| `src/db/queries/shipments.ts:37-44` | Remove `roundPrice` from cost fields |
| `src/db/queries/shipments.ts:108-120` | Add validation: reject quantity increases |
| `src/db/queries/shipments.ts:86-161` | Add validation: reject trueCost changes if sales exist |
| `src/db/queries/shipments.ts:70-81` | Block deletion when linked sales exist |
| `src/db/queries/shipments.ts` | Add wholesaleCost ≤ trueCost assertion |
| `src/db/queries/transactions.ts:196-204` | Fix H1: multiply reversal by qty; remove > 0 guard |
| `src/db/queries/transactions.ts:67-147` | Fix H2: clean up reversal on reactivate |
| `src/db/queries/transactions.ts:150-170` | Fix L1: clean up reversal on refunded delete |
| `src/db/queries/inventory.ts:36` | Remove outer `roundPrice` (fix M3 at data layer) |
| `src/lib/backup/backup.ts:60-82` | Add missing columns to restore INSERTs |
| `src/lib/backup/backup.ts:33-36` | Add version validation |
| `src/components/SellSheet.tsx:52` | Remove outer `roundPrice` (fix M3 at UI layer) |
| `src/components/ReportsView.tsx:43-49` | Fix M2: exclude unlinked from meet-rate |
| `src/components/ReportsView.tsx:181-192` | Add unit annotation to Y-axis |
| `src/components/DashboardView.tsx:53` | Fix M1: correct description text |

---

## Data Integrity Guarantees (Post-Fix)

1. **Backup restore** preserves all columns — no silent data loss
2. **Shipment cost edits** blocked when linked sales exist — no profit history rewrites
3. **Shipment quantity increases** blocked — no negative sold counts
4. **Shipment deletion** blocked when linked sales exist — no orphaned items or broken COGS
5. **Foreign keys** enforced — CASCADE/SET NULL behave as declared
6. **Refund reversals** correctly multiply by quantity — no systematic under-reversal
7. **Refund reversals** cleaned up on reactivate/delete — no orphan entries
8. **Costs stored** at full Poisha precision — no rounding loss
9. **Meet-rate KPI** counts only verifiable transactions — no inflation
10. **Pricing calculations** consistent between SellSheet and TransactionForm
