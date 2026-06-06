# Stock Page: Dedicated Stock Tab with Pagination & Search

## Problem
The Dashboard (Metrics) page shows all stock items in a flat list with no search or pagination. As inventory grows, the list becomes unwieldy.

## Scope
- Add a dedicated "Stock" tab with pagination and search
- Show only top 5 most-sold items on the Dashboard
- Rename the existing "Inventory" tab to "Shipments"

## Design

### 1. New "Stock" tab (5th tab in bottom nav)
**Tab state:** Add `'stock'` to the `activeTab` union type.

**Layout:** Card grid — 2-column responsive (`grid-cols-1 sm:grid-cols-2`), consistent with existing neobrutalist style.

**Search & filters (top bar):**
- Text input for brand name filtering (case-insensitive `.includes()`)
- Min/max wholesale cost range inputs (in Taka)

**Pagination:**
- 10 items per page
- Prev/Next buttons at bottom
- "Page X of Y" indicator

**Card content (per item):**
- Brand name
- Stock badge: `initialQuantity / quantity remaining` (color-coded: red = 0, yellow <= 3, green otherwise)
- Wholesale cost, True cost, Preferred sell price
- **Sell** button

**Data flow:** Receives `inventoryItems` via `App.tsx` (same as Dashboard). Filtering + pagination done client-side in memory.

### 2. DashboardView top 5
- Replace the full stock items list with only **top 5 most-sold items**
- Sort by `(initialQuantity - quantity)` DESC, take top 5
- Same card style, compact section

### 3. Rename "Inventory" tab → "Shipments"
- Remove stock grid section from the existing Inventory tab code
- Rename tab label from "Inventory" to "Shipments"
- Keep only the shipments log

### 4. Edge cases
- **Empty search results:** "No items match your search" message
- **Zero stock items:** "No stock items yet" on both Dashboard top 5 and Stock tab
- **Page overflow:** If filtering reduces results below current page, reset to page 1
- **Cost filter parity:** Cost range is applied in Taka (user-friendly), converted to Poisha internally for comparison
