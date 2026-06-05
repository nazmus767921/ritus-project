# Architecture Context

## Stack
| Layer | Technology | Role |
| ------ | ------ | ------ |
| Framework | React 19 + Vite SPA | Drives the visual layer, executes layout rendering, and coordinates client-side execution loops. |
| UI styling | Tailwind CSS | Supplies utility classes to build view structures adhering strictly to the iOS HIG specification. |
| Query Engine | Drizzle ORM | Compiles relational data definitions and handles queries locally inside the client runtime. |
| Storage Layer | wa-sqlite + IndexedDB | Runs an embedded relational SQL engine in memory, persisting data blocks directly to browser storage. |

## System Boundaries
- `src/components/` — Houses modular UI views, action sheets, and modal patterns. All code in this folder must use pure Tailwind CSS classes.
- `src/db/` — Declares relational tables, defines columns, and runs database initialization commands.
- `src/lib/math/` — Executes client-side mathematical calculations for cost distribution formulas.
- `src/styles/` — Manages global configuration files and core Tailwind design tokens.

## Storage Model
- **wa-sqlite (Local Relational Database)**: Persists operational schemas on the user's device:
  - `transactions`: Stores record values, categories, creation timestamps, and specific text descriptors.
  - `shipments`: Records top-level shipping data, including delivery dates and flat courier fees.
  - `inventory_items`: Tracks individual stock items, storing brand names, quantities, base wholesale costs, and adjusted true costs.
- **IndexedDB**: Serves as the virtual file system (VFS) layer to back up and persist the SQLite database file across app sessions.

## Auth and Access Model
- **Local Isolation**: The system runs entirely within a single client sandbox. No remote server communication occurs.
- **Access Bounds**: Data access is physically constrained to the host device's secure browser instance.
- **No-Auth Session**: The system mounts the dashboard layout immediately upon initialization. It completely bypasses external authentication servers.

## Invariants
1. **Cost Alignment Rule**: The calculated cost of a product record must always match its baseline wholesale cost plus its equal share of the shipment's flat delivery fee.
2. **Stock Floor Boundary**: A product's remaining stock count must never fall below zero. The application must throw an alert and block the transaction if a user attempts to sell an out-of-stock item.
3. **Data Mutation Isolation**: Personal expense records must never be mixed into business net profit calculations. They can only subtract at the final step to define the remaining Safety Pocket budget.
4. **Zero Server Dependency**: All data transformations, reporting metrics, and schema operations must execute locally without making network calls.