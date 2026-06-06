# Stock Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "Stock" tab with pagination, brand search, and cost range filters. Show top 5 most-sold items on Dashboard. Rename "Inventory" tab to "Shipments".

**Architecture:** New `StockView.tsx` component with client-side search/filter/pagination. `DashboardView.tsx` limits to top 5. `App.tsx` adds stock tab + renames inventory tab. FAB button logic updated for new tab.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, lucide-react

---

### Task 1: Create StockView component with pagination and search

**Files:**
- Create: `src/components/StockView.tsx`

- [ ] **Create the component file**

```typescript
import { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { calculatePreferredPrice } from '../lib/math/pricing';
import { formatCurrency } from '../lib/math/rounding';
import type { InventoryItemRecord } from '../db/types';

const PAGE_SIZE = 10;

interface StockViewProps {
  inventoryItems: InventoryItemRecord[];
  targetMarkup: number;
  onSellClick: (item: InventoryItemRecord) => void;
}

export default function StockView({ inventoryItems, targetMarkup, onSellClick }: StockViewProps) {
  const [brandQuery, setBrandQuery] = useState('');
  const [minCostStr, setMinCostStr] = useState('');
  const [maxCostStr, setMaxCostStr] = useState('');
  const [page, setPage] = useState(0);

  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    if (brandQuery.trim()) {
      const q = brandQuery.toLowerCase();
      items = items.filter(item => item.brand.toLowerCase().includes(q));
    }

    if (minCostStr.trim()) {
      const minPoisha = Math.round(parseFloat(minCostStr) * 100);
      if (!isNaN(minPoisha)) {
        items = items.filter(item => item.wholesaleCost >= minPoisha);
      }
    }

    if (maxCostStr.trim()) {
      const maxPoisha = Math.round(parseFloat(maxCostStr) * 100);
      if (!isNaN(maxPoisha)) {
        items = items.filter(item => item.wholesaleCost <= maxPoisha);
      }
    }

    return items;
  }, [inventoryItems, brandQuery, minCostStr, maxCostStr]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  // Reset to page 0 if current page is out of bounds
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);

  const paginatedItems = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  const handleSearchChange = (value: string) => {
    setBrandQuery(value);
    setPage(0);
  };

  const handleMinCostChange = (value: string) => {
    setMinCostStr(value);
    setPage(0);
  };

  const handleMaxCostChange = (value: string) => {
    setMaxCostStr(value);
    setPage(0);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search & Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by brand..."
            value={brandQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-xs text-black focus:outline-none min-h-[36px]"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              placeholder="Min wholesale (৳)"
              value={minCostStr}
              onChange={(e) => handleMinCostChange(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[36px]"
            />
          </div>
          <div className="flex-1">
            <input
              type="number"
              placeholder="Max wholesale (৳)"
              value={maxCostStr}
              onChange={(e) => handleMaxCostChange(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[36px]"
            />
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-black" /> Stock Items
        </h2>
        <span className="text-xs font-sans font-bold text-slate-600">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-black p-12 text-center text-slate-500 text-sm shadow-neobrutal-sm">
          <Package className="w-10 h-10 mx-auto mb-3 text-black opacity-60" />
          <p className="font-sans font-bold text-black text-base uppercase">
            {inventoryItems.length === 0 ? 'No Stock Items Logged' : 'No items match your search.'}
          </p>
          <p className="mt-2 text-xs text-slate-600">Tap the "+" button below to import a shipment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paginatedItems.map((item) => {
            let badgeClass = '';
            let badgeLabel = '';
            if (item.quantity === 0) {
              badgeClass = 'bg-red-400 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
              badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
            } else if (item.quantity <= 3) {
              badgeClass = 'bg-yellow-300 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
              badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
            } else {
              badgeClass = 'bg-green-400 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
              badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
            }

            const preferredPrice = calculatePreferredPrice(item.trueCost, targetMarkup);

            return (
              <div key={item.id} className="bg-white rounded-xl border-2 border-black p-4 shadow-neobrutal-sm flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal transition-all duration-200">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">Batch #{item.id}</span>
                    <h3 className="text-base font-sans font-bold text-black truncate max-w-[130px]">{item.brand}</h3>
                  </div>
                  <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-md border-2 ${badgeClass} uppercase tracking-wider shrink-0`}>
                    {badgeLabel}
                  </span>
                </div>

                <div className="border-t-2 border-black pt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">Wholesale</span>
                    <span className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">True Cost</span>
                    <span className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">Pref Sell</span>
                    <span className="text-purple-600 font-extrabold">{formatCurrency(preferredPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSellClick(item)}
                  disabled={item.quantity === 0}
                  className={`mt-3 w-full min-h-[40px] text-xs font-sans font-bold uppercase tracking-wider py-2 px-4 rounded-xl border-2 border-black transition-all ${
                    item.quantity === 0
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-purple-600 text-white hover:bg-purple-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-neobrutal-sm cursor-pointer'
                  }`}
                >
                  Sell
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredItems.length > PAGE_SIZE && (
        <div className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-black shadow-neobrutal-sm">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="text-xs font-sans font-bold uppercase px-3 py-1.5 rounded-lg border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Prev
          </button>
          <span className="text-xs font-sans font-bold text-slate-600">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="text-xs font-sans font-bold uppercase px-3 py-1.5 rounded-lg border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add src/components/StockView.tsx
git commit -m "feat: create StockView component with pagination, search, and cost filters"
```

---

### Task 2: Update DashboardView to show top 5 most-sold items

**Files:**
- Modify: `src/components/DashboardView.tsx`

- [ ] **Replace the full inventory flat list with top 5 most-sold items**

The "Active Stock Items" section currently iterates over all `inventoryItems`. Replace it to show only top 5 sorted by `(initialQuantity - quantity)` DESC.

Add a `topSelling` computed value near the top of the component (after the prop destructuring, around line 21):
```typescript
  const topSelling = useMemo(() => {
    return [...inventoryItems]
      .sort((a, b) => (b.initialQuantity - b.quantity) - (a.initialQuantity - a.quantity))
      .slice(0, 5);
  }, [inventoryItems]);
```

Add `useMemo` to the imports:
```typescript
import { useState, useEffect, useRef, useMemo } from 'react';
```

Replace the inventory items map (line 297 `inventoryItems.map((item) => {`) with:
```typescript
            topSelling.map((item) => {
```

Also update the "Total Batches" display:
```typescript
            Total Batches: {inventoryItems.length} {inventoryItems.length > 5 ? `(top 5 shown)` : ''}
```

- [ ] **Commit**

```bash
git add src/components/DashboardView.tsx
git commit -m "feat: show only top 5 most-sold items on Dashboard"
```

---

### Task 3: Add Stock tab to App.tsx and rename Inventory → Shipments

**Files:**
- Modify: `src/App.tsx`

- [ ] **Import StockView**

Add import after other component imports:
```typescript
import StockView from './components/StockView';
```

Also add `Layers` icon to the lucide import if not already present. Check line 427 — `Layers` is already imported from `lucide-react` on line 4.

- [ ] **Update the tab union type (line 54)**

Replace:
```typescript
const [activeTab, setActiveTab] = useState<'dashboard' | 'finances' | 'inventory' | 'reports'>('dashboard');
```
With:
```typescript
const [activeTab, setActiveTab] = useState<'dashboard' | 'finances' | 'inventory' | 'reports' | 'stock'>('dashboard');
```

- [ ] **Add Stock tab content before the Reports tab (around line 788)**

Before the closing `} else {` for Reports (before line 788), add:
```typescript
          ) : activeTab === 'stock' ? (
            <StockView
              inventoryItems={inventoryRecords}
              targetMarkup={targetMarkup}
              onSellClick={(item) => {
                setSelectedSellItem(item);
                setIsSellOpen(true);
              }}
            />
```

- [ ] **Update the title bar to show "Stock" (line 317)**

Replace:
```typescript
activeTab === 'inventory' ? 'ClothEx_Inventory.exe' : 'ClothEx_Reports.exe'
```
With:
```typescript
activeTab === 'inventory' ? 'ClothEx_Shipments.exe' : activeTab === 'stock' ? 'ClothEx_Stock.exe' : 'ClothEx_Reports.exe'
```

- [ ] **Add "Stock" button to bottom tab bar (before Reports)**

Insert between the Inventory/Shipments button and the Reports button (around line 852):
```typescript
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'stock'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <Package className="w-5 h-5 shrink-0" />
          <span>Stock</span>
        </button>
```

- [ ] **Rename Inventory tab to Shipments (line 851)**

Change the tab label:
```typescript
<span>Inventory</span>
```
To:
```typescript
<span>Shipments</span>
```

Also change the icon from `Package` to `Database` (already imported) to match the shipments theme. The Package icon used for the Stock tab (step above) is already appropriate.

Line 850: `<Package className="w-5 h-5 shrink-0" />` → `<Database className="w-5 h-5 shrink-0" />`

- [ ] **Update the FAB button logic (lines 799-815)**

The FAB should work for both `inventory` (shipments) and `stock` tabs:
```typescript
      {activeTab !== 'reports' && activeTab !== 'dashboard' && (
```

And the action:
```typescript
            if (activeTab === 'inventory' || activeTab === 'stock') {
```

- [ ] **Remove the stock grid section from the Inventory tab**

In the `activeTab === 'inventory'` section (lines 660-787), remove lines 660-740 (the entire stock grid section including summary metrics, search, and grid). Keep only the Shipments Log section (lines 742-786).

Also update the title: change `"Active Stock Batches"` to `"Shipments Log"` and remove the `filteredInventory` related code since it won't be needed anymore. Remove the `invSearchQuery` state if it's no longer used.

Actually, `invSearchQuery` is used in `filteredInventory`. Since we're removing the stock grid from the inventory tab, `filteredInventory` and `invSearchQuery` are no longer needed. Remove them from App.tsx:

- Remove `const [invSearchQuery, setInvSearchQuery] = useState('');` (line 76)
- Remove `filteredInventory` useMemo (lines 99-103)
- Remove the entire stock grid section from the inventory tab content

- [ ] **Run tests**

Run: `npx vitest run`
Expected: PASS (may need to check for type errors with new tab union)

- [ ] **Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Stock tab, rename Inventory to Shipments in App"
```
