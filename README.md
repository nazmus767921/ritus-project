# ClothEx

<p align="center">
  <img src="public/tailor_cat.png" alt="Tailor Cat" width="200" />
</p>

A playful offline-first finance and stock manager for a boutique clothing business with dual revenue streams: tailoring services and clothing retail. Runs entirely in the browser with zero server dependency.

---

## Features

### Financial Tracking
- Dual-stream income and expense logging for tailoring and clothing categories
- Personal expenses tracked separately from business profit
- Transaction notes, customer names, and refund status

### Inventory & Shipments
- Multi-brand stock tracking with shipment intake workflows
- Proportional courier fee allocation across items in a batch
- One-click product sales with automatic stock decrement
- Markup-based preferred selling price suggestions

### Dashboard
- Live aggregated metrics: Tailoring Net, Clothing Net, Total Business Profit, Safety Pocket
- Active stock list with real-time quantities
- Color-coded metric cards with directional indicators

### Reports
- Monthly sales and profit charts rendered as SVG
- Key performance indicators for business health
- Cash flow statistics and trend analysis

### Security & Backup
- 6-digit PIN lock for app access
- Auto-backup to browser localStorage
- Manual JSON export and import for portability

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 (SPA) |
| Language | TypeScript 6 |
| Styling | Tailwind CSS 4 |
| Database | wa-sqlite (WebAssembly SQLite) |
| Persistence | IndexedDB via IDBBatchAtomicVFS |
| ORM | Drizzle ORM |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Testing | Vitest |
| Linting | ESLint 10 |

All currency values are stored as scaled integers (Taka x 100 = Poisha) to avoid floating-point precision errors.

---

## Project Structure

```
ClothEx/
├── index.html                 # HTML entry point
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Main application component
│   ├── index.css              # Tailwind CSS v4 theme configuration
│   ├── components/
│   │   ├── DashboardView.tsx  # Dashboard with metric cards and stock list
│   │   ├── ReportsView.tsx    # Reports tab with SVG charts and KPIs
│   │   ├── StockView.tsx      # Inventory stock list view
│   │   ├── TransactionForm.tsx # Financial transaction input
│   │   ├── ShipmentForm.tsx   # Multi-brand shipment intake
│   │   ├── SellSheet.tsx      # Product sale bottom sheet
│   │   ├── PinScreen.tsx      # 6-digit PIN lock screen
│   │   ├── BottomSheet.tsx    # Reusable bottom sheet component
│   │   ├── SystemAlert.tsx    # Reusable alert modal
│   │   └── QuantityInput.tsx  # Quantity input component
│   ├── db/
│   │   ├── client.ts          # wa-sqlite init, IndexedDB VFS, Drizzle bridge
│   │   ├── schema.ts          # Drizzle ORM table definitions
│   │   ├── types.ts           # TypeScript interfaces for data models
│   │   └── queries/           # Dashboard, inventory, shipments, transactions
│   └── lib/
│       ├── math/
│       │   ├── allocator.ts   # Proportional shipping cost allocation
│       │   ├── pricing.ts     # Markup-based pricing calculations
│       │   └── rounding.ts    # Currency rounding utilities
│       └── backup/
│           └── backup.ts      # Auto-backup and manual export/import
├── public/
│   ├── tailor_cat.png         # Tailor Cat mascot
│   ├── favicon.svg            # SVG favicon
│   └── manifest.json          # Web app manifest
└── contexts/                  # Project documentation
    ├── project-overview.md    # Product definition and goals
    ├── architecture.md        # System structure and storage model
    ├── ui-context.md          # Neobrutalist theme and design tokens
    └── code-standards.md      # Implementation conventions
```

---

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Type-check and build for production
npm run test      # Run unit tests
npm run lint      # Run ESLint
```

---

## Key Invariants

1. **Cost Alignment** — Product cost always equals wholesale cost plus proportional courier fee share.
2. **Stock Floor** — Stock count never drops below zero. Sales of out-of-stock items are blocked.
3. **Expense Isolation** — Personal expenses never mix into business profit calculations.
4. **Zero Server** — Everything runs locally. No network calls required.

---

<p align="center">
  <img src="public/tailor_cat_happy.png" alt="Tailor Cat Happy" width="120" />
</p>
