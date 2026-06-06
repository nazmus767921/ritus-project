# ClothEx

A playful offline-first finance and stock manager for a boutique clothing business with dual revenue streams: tailoring services and clothing retail.

- **Financial tracking**: Income/expense logging for tailoring, clothing, and personal categories
- **Inventory management**: Multi-brand stock tracking with shipment intake and proportional courier fee allocation
- **Sales execution**: One-click sell with preferred price suggestions based on markup targets
- **Reporting**: Monthly sales/profit charts, KPI dashboard, meet rate analysis
- **Local storage**: WebAssembly SQLite with IndexedDB persistence (fully offline)
- **Backup & restore**: Auto-backup to localStorage, manual JSON export/import

## Tech Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · Drizzle ORM · wa-sqlite · Lucide Icons

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Type-check and build for production
npm run test      # Run unit tests
npm run lint      # Run ESLint
```
