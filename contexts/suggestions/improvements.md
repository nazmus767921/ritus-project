# ClothEx — Improvement Suggestions

Generated via codebase audit + grill-me session.
Date: 2026-06-06

---

## CRITICAL

### [Bug] `refundTransaction` doesn't undo courier fee overhead
- **File:** `src/db/queries/inventory.ts`
- **Issue:** When a sale is refunded, stock is restored (+1) but the courier fee cost allocation from `ShipmentForm`'s Option A calculation is not reversed. This leaves orphaned cost allocations and inflates shipping expense metrics.
- **Fix:** The refund should also create a reversing journal entry for the proportional courier fee that was allocated to that sold item.

### [Bug] `deleteShipment` uses hardcoded string matching for courier fee transaction
- **File:** `src/db/queries/shipments.ts`
- **Issue:** The deletion logic finds the associated courier fee transaction by matching a template string (`"Shipment #${shipmentId} Courier Fee Overhead"`). If the user edits that transaction's description (which `TransactionForm` allows), the string won't match and the deletion silently fails to remove the fee entry.
- **Fix:** Store the courier transaction's row ID on the shipment record, or join via a foreign key, instead of relying on string matching.

---

## HIGH

### [Code Quality] Replace `any` types with proper TypeScript interfaces
- **Files:** `src/App.tsx`, `src/components/*.tsx`, `src/db/queries/*.ts`
- **Issue:** Despite strict TypeScript configuration, many props, state variables, and return values are typed as `any`:
  - `testRecords: any[]`, `inventoryRecords: any[]`, `shipmentRecords: any[]`
  - `transaction?: any | null`, `metrics: any`
  - Various handler parameters typed as `any`
- **Fix:** Define and export proper interfaces for `TransactionRecord`, `InventoryItem`, `ShipmentRecord`, `DashboardMetrics`, etc. (potentially in a shared types file or alongside schemas) and use them consistently.

### [New Feature] Search/filter for transactions and inventory
- **Current state:** No search or filter capability exists. Users scroll through all records.
- **Suggestion:** Add a search bar and/or filter controls (by date range, category, type, etc.) to the Finances and Inventory tabs.

### [New Feature] Data pagination for large datasets
- **Current state:** All records are loaded and rendered at once. As the business grows, this will cause performance degradation.
- **Suggestion:** Implement pagination (or virtual scrolling) for transaction lists and inventory lists, with server-side (SQL `LIMIT/OFFSET`) or client-side slicing.

---

## MEDIUM

### [Code Quality] Extract state logic from monolithic `App.tsx`
- **File:** `src/App.tsx` (718 lines)
- **Issue:** All application state (`useState`) and data-fetching logic (`useEffect`, `refreshAll`) lives in the root component. Child views receive data via deep prop drilling. This makes the component hard to test, reason about, and extend.
- **Suggestion:** Extract data layer into a custom hook (e.g., `useAppData`) or a React Context provider. Consider splitting into focused hooks (`useTransactions`, `useInventory`, `useShipments`, `useMetrics`).

### [Performance] Parallelize independent DB queries in `refreshAll`
- **File:** `src/App.tsx`
- **Issue:** `refreshAll()` awaits each of 4 queries sequentially. These queries are independent (transactions, inventory, shipments, metrics) and could run in parallel.
- **Fix:** Use `Promise.all()` to execute all four fetches concurrently, reducing total refresh time.

### [Performance] Throttle `autoBackupLocal()` on mutations
- **File:** `src/App.tsx`
- **Issue:** `autoBackupLocal()` serializes all 4 tables to JSON and writes to `localStorage` on **every** mutation (save, delete, refund, sell). On large datasets this creates noticeable lag.
- **Fix:** Debounce the backup (e.g., 2–3 second delay after the last mutation), or use a mutation counter to only backup every N changes.

### [Performance] Use SQL aggregation instead of in-memory iteration
- **File:** `src/db/queries/dashboard.ts`
- **Issue:** `fetchAggregatedMetrics()` loads ALL transactions into JavaScript memory and iterates to compute sums, averages, and margins. A single SQL query with `SUM`, `AVG`, and `GROUP BY` would be faster and scale better.
- **Fix:** Rewrite metric calculations as SQL aggregate queries against the Drizzle ORM.

### [Feature Improvement] Connect mascot mood images to business state
- **Files:** `public/tailor_cat_happy.png`, `public/tailor_cat_neutral.png`, `public/tailor_cat_sad.png`, `src/components/DashboardView.tsx`
- **Issue:** Three mascot variants exist on disk but `DashboardView.tsx` always uses `/tailor_cat.png` regardless of business state (the `getMascotConfig` function already computes mood but doesn't switch the image source).
- **Fix:** Map the computed mood to the corresponding PNG variant in `getMascotConfig()`.

### [New Feature] Local PIN lock
- **Current state:** No access control at all. Anyone who opens the browser can see all financial data.
- **Suggestion:** Add an optional PIN/passcode screen on app load, stored in `localStorage` (hashed), with a setting to enable/disable it. This is a lightweight addition since there's no server.

---

## LOW

### [Cleanup] Remove unused template assets
- **Files:** `src/assets/react.svg`, `src/assets/vite.svg`
- **Issue:** These are leftover from the Vite scaffold and are not imported anywhere in the source code.

### [Cleanup] Remove empty `App.css`
- **File:** `src/App.css`
- **Issue:** Contains only a comment; serves no purpose. Remove and unlink from `App.tsx` or `main.tsx`.

### [Cleanup] Update `README.md` from default Vite template
- **File:** `README.md`
- **Issue:** Still contains the default Vite welcome text rather than project documentation.

### [Cleanup] Remove unused mascot PNG variants (if not needed)
- **Files:** `public/tailor_cat_happy.png`, `public/tailor_cat_neutral.png`, `public/tailor_cat_sad.png`
- **Issue:** If the mood-based image switching improvement above is not planned, these files are dead weight. If it is planned, they should remain.
