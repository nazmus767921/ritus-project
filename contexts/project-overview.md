# Project Overview - ClothEx

## Overview
This application tracks daily finances and product inventory locally on a single device for a boutique business operating dual-revenue streams: service-based tailoring and product-based clothing retail. The application segregates personal expenditures from company cash flows, logs granular product batches by brand, and executes proportional shipping cost allocations locally to safeguard reinvestment capital.

## Goals
1. Segregate tailoring service income from retail clothing sales into independent, client-side data vectors.
2. Automate true product cost tracking by executing local Option A distribution math to divide shipment courier fees among unit quantities.
3. Enforce financial separation by processing personal expenses completely outside of business net calculations.
4. Calculate a live "Safety Pocket" balance to establish an absolute spending ceiling for future inventory purchases.

## Core User Flow
1. **Execute Transaction Entry**: The user opens the input sheet, types a financial value, assigns a specific classification tag, and saves the record.
2. **Import Incoming Shipment**: The user inputs a flat courier delivery fee alongside an itemized batch list containing brand names, unit counts, and original wholesale costs.
3. **Run Cost Distribution**: The system divides the flat shipping fee by the total unit count and increments each item's baseline wholesale cost to lock in the true unit cost.
4. **Log Product Sale**: The user selects an item from the active stock view and enters the final retail sale price. The system registers the transaction and decrements the remaining stock count by exactly one unit.
5. **Inspect Dashboard Metrics**: The user views live, locally aggregated cards displaying Tailoring Net, Clothing Net, Total Business Profit, and the remaining Safety Pocket budget.

## Features
### 1. Dual-Stream Financial Logger
- **Income Separation Interface**: Separate inputs for service fees (Tailoring) and inventory sales (Clothing).
- **Expense Categorizer**: Strict classification tags for Personal Expenses, Tailoring Expenses, and Clothing Business Overhead.

### 2. Itemized Inventory & Shipment Manager
- **Line-Item Batch Input**: Tabular forms to log shipments containing multi-brand products, unit counts, and purchase costs.
- **Automated Shipping Cost Allocator**: An embedded math processor that adds per-unit shipping overhead directly into the item's stored cost array.
- **Local Stock Tally**: Real-time counter tracking remaining stock quantities and the total capital value tied up in active inventory.

### 3. iOS HIG-Compliant Dashboard
- **True Profit Readout**: Live counters subtracting the fully allocated product cost from the logged retail sale price.
- **Safety Pocket Tracker**: A high-visibility interface component displaying Total Business Profit minus total Personal Spent to define future buying limits.

## Scope
### In Scope
- Client-side transaction tracking and inventory management running inside a browser environment.
- Proportional shipment cost allocation (Option A) executed entirely on device.
- Immediate stock decrement processing upon sale finalization.
- iOS Human Interface Guidelines layout structures, view patterns, and component transitions.

### Out of Scope
- Server-side data persistence, cloud data synchronization, and multi-device replication.
- User management, external authentication protocols, and multi-tenant separations.
- Automated API integrations with banking facilities or external e-commerce webhooks.
- Multi-currency conversions; all calculations are locked strictly to Taka.

## Success Criteria
1. The application must calculate and display adjusted per-item costs immediately upon logging a shipment with an associated flat courier fee.
2. A logged product sale must decrement the active stock count by exactly one unit and update the dashboard metrics instantly without page reloads.
3. The dashboard must continuously display a live "Safety Pocket" balance representing Total Business Profit minus total Personal Spent.