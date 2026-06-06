# Progress Tracker - ClothEx

Update this file after every meaningful implementation change.

## Current Phase

- **Development Phase 06**: CRUD, Refunds, Backups, Markup Pricing & Reports (New Features)

## Current Goal

- Support transaction/shipment edit/delete, refunds with stock restoration, budget goals setting, local automatic/manual backups, markup-based preferred pricing, and Reports view dashboard.

## Completed

- **Phase 06: CRUD, Refunds, Backups, Markup Pricing & Reports (New Features)**:
  - [x] Removed Math Playground and relational sandbox buttons.
  - [x] Implemented settings table and edit/delete/refund operations on transactions (with auto stock adjustment).
  - [x] Added edit/delete options for Shipments (with cascade inventory deletes and courier fee updates).
  - [x] Integrated stock selector dropdown on Clothing Income category transaction form with auto-filled prices.
  - [x] Built local auto-backup (persisting database state to localStorage on every update) and manual backup downloads/imports.
  - [x] Implemented markup-based preferred selling prices on Sell dialog and inventory tables while keeping report KPIs margin-based.
  - [x] Added Reports tab with cash flow statistics, meet rate KPIs, SVG monthly sales/profit chart, and breakdown tables.
  - [x] Confirmed zero-type-flag production build and full unit test coverage.
- **Phase 00: Specification & Design Definition**:
  - [x] `contexts/specs/01-project-setup-database-spec.md` (React 19 + Vite environment setup, SQLite tables schema, Option A math utility)
  - [x] `contexts/specs/02-financial-logger-spec.md` (Dual-stream financial inputs, expense categorization, strict boundary validations)
  - [x] `contexts/specs/03-inventory-shipment-manager-spec.md` (Multi-brand shipment batch logs, proportional cost allocation integration, database transaction blocks)
- Phase 04: iOS HIG-Compliant Dashboard:
  - [x] Implementing dashboard metric widgets, dynamic calculation aggregates, and stock-decrement sales triggers.
- **Phase 01: Project Setup & Database Configuration**:
  - [x] Setup of React + Vite SPA structure.
  - [x] Integration of `wa-sqlite` and `IndexedDB` storage systems with Drizzle ORM client.
  - [x] Setup of Option A math helper logic.
  - [x] Confirmed end-to-end builds with Tailwind CSS v4 and full unit test coverage using Vitest.
- **Phase 02: Dual-Stream Financial Logger**:
  - [x] Implemented transaction query functions `insertTransaction` and `getTransactions` inside `src/db/queries/transactions.ts`.
  - [x] Designed `TransactionForm` component representing a native-feeling iOS Action Sheet modal.
  - [x] Built the Parent Segmented Control for switching between Income and Expense modes, automatically defaulting sub-categories.
  - [x] Implemented strict validation checks for amounts (positive number boundaries) and description (non-blank).
  - [x] Created custom iOS-style centered Alert Modal overlay for displaying error boundary failures.
  - [x] Integrated form-triggering floating action button inside `App.tsx` and bound transactions refresh.
- **Phase 03: Itemized Inventory & Shipment Manager**:
  - [x] Designed and implemented `createShipmentTransaction` query inside `src/db/queries/shipments.ts` leveraging SQLite transactions.
  - [x] Implemented `getInventoryItems` query inside `src/db/queries/inventory.ts` to retrieve stock lists.
  - [x] Coded the dynamic batch input form `ShipmentForm.tsx` supporting variable item lines, deletion buttons, and live Option A true cost calculation.
  - [x] Added tab bar navigation inside `App.tsx` (switching between Finances and Inventory tabs) and integrated the new components.
  - [x] Designed responsive Stock Card List with stock status badges (green/amber/red) and wholesale vs true unit cost outputs.
  - [x] Confirmed end-to-end production compilation and vitest suite execution.
- **Phase 04: iOS HIG-Compliant Dashboard**:
  - [x] Designed and built `DashboardView.tsx` with a 2x2 grid of dynamic financial aggregate cards and an active stock list.
  - [x] Added `fetchAggregatedMetrics` dynamic query inside `src/db/queries/dashboard.ts` to aggregate transaction categories.
  - [x] Coded `executeProductSale` database transaction query inside `src/db/queries/inventory.ts` verifying stock availability, decrementing count, and logging income.
  - [x] Developed `SellSheet.tsx` iOS-style bottom action sheet for entering retail sale price and handling input validation.
  - [x] Integrated the Dashboard tab bar option and linked modal actions and refreshing loops in `App.tsx`.
- **Phase 05: Bold Neobrutalist UI Revamp**:
  - [x] Redefined UI design context (`contexts/ui-context.md`) with Retro Pop Mustard & Purple color scheme, Neobrutalist outlines, and flat offset shadows.
  - [x] Loaded Google Fonts (`Space Grotesk` & `Lexend`) in `index.html` and bound them to Tailwind v4 display and sans families in `src/index.css`.
  - [x] Restructured main page layout in `src/App.tsx` as a Retro Software Window, including a header control bar, floating tab bar deck, and styled inputs.
  - [x] Revamped dashboard card metrics grid and stock lists into tactile Neobrutalist widgets inside `src/components/DashboardView.tsx`.
  - [x] Transformed sliding bottom sheets into centered Retro System Dialog Modals for transactions (`TransactionForm.tsx`), shipments (`ShipmentForm.tsx`), sales (`SellSheet.tsx`), and error alerts.
  - [x] Integrated the **Tailor Cat** shopkeeper mascot using the exact bread-holding cat image provided by the user, setting the card background color to matching `#fceec7` to blend in, with amped-up Dhakaiya merchant slang in Bengali (`আপু`, `বউনি`, `লাল বাতি`, `ফতুর`, `ক্যালাও`) reacting dynamically on the Metrics Dashboard.
  - [x] Verified full unit test execution and clean production compilation.
  - [x] Merged feature branch (`feature/03-inventory-shipment-manager-spec`) into the default `main` branch and verified remote push.

## In Progress

- None.

## Completed

- **Refactor: Stock Tracking, Math Refactoring & UI Redesign**:
  - [x] Added `initialQuantity` column to schema and InventoryItemRecord type
  - [x] Created rounding utility (`roundStock`, `roundPrice`) and applied across allocator, pricing, shipment queries, and inventory queries
  - [x] Updated quantity parsing in ShipmentForm to use `Math.round(parseFloat())`
  - [x] Redesigned TransactionForm category selector as 2-column icon grid
  - [x] Updated DashboardView badges to `[initial / remaining]` format
  - [x] Added data migration in `client.ts` for existing `initial_quantity` column

## Next Up

- None.

## Open Questions

- None.

## Architecture Decisions

- Decided to use **wa-sqlite** running WebAssembly SQLite in-memory with **IndexedDB** as the VFS layer to allow robust relational capabilities inside the browser with zero remote server dependency.
- Enforced strict integer scaling (Poisha = Taka * 100) across all columns storing currency values in the database to prevent floating-point calculation errors.

## Session Notes

- Initialized the specifications directory with four clear feature spec modules mapped directly to the design principles and system invariants defined in `architecture.md` and `project-overview.md`.
- Bootstrapped Vite + React 19 + TypeScript SPA in the root workspace.
- Configured `@vlcn.io/wa-sqlite` running on `IDBBatchAtomicVFS` (IndexedDB) with `drizzle-orm/sqlite-proxy` database driver.
- Programmed table schemas (`transactions`, `shipments`, `inventory_items`) inside `src/db/schema.ts` and automated their creation on database initialization.
- Coded the Option A shipping allocator math library inside `src/lib/math/allocator.ts` and successfully verified its logic through comprehensive unit tests running on `vitest`.
- Created a separate database queries module `src/db/queries/transactions.ts` for database transaction actions.
- Built a high-fidelity iOS HIG-compliant `TransactionForm` action sheet, with sub-selectors, state defaults, and micro-animations styled inside `src/index.css` using Tailwind CSS v4 variables.
- Verified end-to-end project compilation (`npm run build`) and all tests passing (`npm run test`) with zero TypeScript, syntax, or linter warnings.
- Coded database transaction queries inside `src/db/queries/shipments.ts` and `src/db/queries/inventory.ts` for atomic inventory management.
- Implemented multi-brand dynamic batch input form `ShipmentForm.tsx` with floating labels, deletion behaviors, and live Option A calculations.
- Structured bottom tab navigation inside `App.tsx` matching iOS HIG patterns for separating Finances and Inventory views.
- Created reactive Stock Card List with stock status warning badges.
- Created `src/db/queries/dashboard.ts` to compute dynamic aggregates for Tailoring Net, Clothing Net, Total Business Profit, and Safety Pocket.
- Implemented `executeProductSale` database transaction block inside `src/db/queries/inventory.ts` enforcing quantity boundaries.
- Built `SellSheet.tsx` bottom action sheet for logging retail prices and executing sale decrements.
- Created `DashboardView.tsx` component with iOS metrics grid and active stock table.
- Integrated dashboard navigation and modal toggles inside `App.tsx`.



