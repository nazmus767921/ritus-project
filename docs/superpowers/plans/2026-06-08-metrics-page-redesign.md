# Metrics Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the metrics (Dashboard) view into narrative-based sections with a hero metric, inline SVG charts, floating mascot, compact stock list, and empty state.

**Architecture:** Split the monolithic DashboardView into 8 focused sub-components under `src/components/metrics/`. Each component receives only the props it needs. The DashboardView becomes a thin orchestrator that composes sections and handles the data-to-presentation wiring. No external chart libraries — hand-coded SVG for the two inline charts.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide icons, Framer Motion (via `motion/react`), neobrutalist design system (3px black borders, heavy shadows, Space Grotesk/Lexend fonts).

**Layout flow:** Hero (Safety Pocket progress) → 2-col Revenue + Cash Position → Stock Health → Compact Stock List → Floating Mascot (fixed bottom-right).

**New file convention:** `src/components/metrics/` subdirectory — first subdirectory in components/. Established because we're creating 8 tightly-related files for this single view.

---

### Task 1: Create `src/components/metrics/ProgressBar.tsx`

**Files:**
- Create: `src/components/metrics/ProgressBar.tsx`

- [ ] **Step 1: Write the ProgressBar component**

```tsx
interface ProgressBarProps {
  current: number;
  target: number;
  formatValue: (n: number) => string;
}

export default function ProgressBar({ current, target, formatValue }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isExceeded = target > 0 && current >= target;
  const isCritical = current <= 0;

  let barColor = 'bg-yellow-400';
  if (isExceeded) barColor = 'bg-green-400';
  else if (isCritical) barColor = 'bg-red-400';
  else if (pct > 75) barColor = 'bg-orange-400';

  return (
    <div className="space-y-1.5">
      <div className="relative h-4 bg-white rounded-full border-[3px] border-black overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute right-0 top-0 h-full w-0.5 bg-black opacity-50" />
      </div>
      <div className="flex justify-between text-[9px] font-sans font-bold uppercase tracking-wider text-slate-700">
        <span>{formatValue(current)} current</span>
        <span>{formatValue(target)} target</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 2: Create `src/components/metrics/MiniBarChart.tsx`

**Files:**
- Create: `src/components/metrics/MiniBarChart.tsx`

- [ ] **Step 1: Write the MiniBarChart component**

```tsx
interface BarItem {
  label: string;
  value: number;
  color: string;
}

interface MiniBarChartProps {
  bars: BarItem[];
  formatValue: (n: number) => string;
  height?: number;
}

export default function MiniBarChart({ bars, formatValue, height = 64 }: MiniBarChartProps) {
  const maxValue = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="bg-white rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${bars.length * 60} ${height}`}
        className="overflow-visible"
      >
        {bars.map((bar, i) => {
          const barHeight = (bar.value / maxValue) * (height - 20);
          const x = i * 60 + 8;
          const y = height - 10 - barHeight;
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={28}
                height={barHeight}
                rx={4}
                fill={bar.color}
                stroke="black"
                strokeWidth={2}
                className="transition-all duration-500"
              />
              <text
                x={x + 14}
                y={height - 2}
                textAnchor="middle"
                className="fill-slate-700 text-[8px] font-sans font-bold uppercase"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 3: Create `src/components/metrics/EmptyDashboard.tsx`

**Files:**
- Create: `src/components/metrics/EmptyDashboard.tsx`

- [ ] **Step 1: Write the EmptyDashboard component**

```tsx
import { Package } from 'lucide-react';

export default function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-[#fceec7] rounded-2xl border-[3px] border-black p-6 shadow-neobrutal max-w-sm text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full border-[3px] border-black overflow-hidden bg-[#fceec7] shadow-neobrutal-sm">
          <img src="/tailor_cat_sad.png" alt="Tailor Cat" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-sans font-extrabold uppercase tracking-wider text-purple-600">
            টেইলর বিলাই (বউনি নাই)
          </p>
          <p className="mt-2 text-sm font-sans font-semibold text-black leading-snug">
            দোকান তো ফাঁকা! আজকা কি বউনি হইবো না? ইনভেন্টরি ট্যাবে গিয়া জলদি কিছু মাল আমদানি করো মিয়াও!
          </p>
        </div>
        <p className="text-xs text-slate-600 font-sans font-medium">
          Your dashboard will light up once you add inventory and record transactions.
        </p>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
            <Package className="w-4 h-4" /> Go to Inventory tab
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 4: Create `src/components/metrics/MascotFloating.tsx`

Extracts the dynamic mascot logic from the current DashboardView into a standalone floating icon.

**Files:**
- Create: `src/components/metrics/MascotFloating.tsx`

- [ ] **Step 1: Write MascotFloating component**

```tsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { DashboardMetrics, InventoryItemRecord } from '../../db/types';

interface MascotFloatingProps {
  metrics: DashboardMetrics;
  inventoryItems: InventoryItemRecord[];
  safetyPocketTarget: number;
}

function getMascotImage(mood: string): string {
  switch (mood) {
    case 'happy': return '/tailor_cat_happy.png';
    case 'neutral': return '/tailor_cat_neutral.png';
    case 'sad': return '/tailor_cat_sad.png';
    default: return '/tailor_cat.png';
  }
}

function getMascotConfig(metrics: DashboardMetrics, inventoryItems: InventoryItemRecord[], safetyPocketTarget: number) {
  if (inventoryItems.length === 0) {
    return { mood: 'sad', image: getMascotImage('sad'), dialogue: "আরে আপু, ক্যাশবাক্স তো বসাইছি কিন্তু দোকান তো ফাঁকা! আজকা কি বউনি হইবো না? ইনভেন্টরি ট্যাবে গিয়া জলদি কিছু মাল আমদানি করো মিয়াও! 📦", title: "টেইলর বিলাই (বউনি নাই)" };
  }
  if (metrics.safetyPocket < 0) {
    return { mood: 'sad', image: getMascotImage('sad'), dialogue: "হায় হায় আপু! লাভের গুড় পিঁপড়ায় খাইলো! পকেটে লাল বাতি জইলা গেছে, ফতুর দশা মিয়াও! নতুন মাল কেনা আপাতত বন্ধ রাখো! 🙀", title: "টেইলর বিলাই (লাল বাতি)" };
  }
  if (metrics.safetyPocket < safetyPocketTarget) {
    return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "আরে আপু, ক্যাশবাক্সের অবস্থা সুবিধার না! পকেটে লাল বাতি জইলা যাইবো মিয়াও! হাত একটু টান করো! 🐾", title: "টেইলর বিলাই (সাবধানী)" };
  }
  const hasLowStock = inventoryItems.filter(item => item.quantity <= 3).length > 0;
  if (hasLowStock) {
    return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "আরে মিয়াও! দোকানে কিছু মাল তো হাওয়া হইয়া ফক্কা! বউনি করার মতও কিছু নাই। কাস্টমার চিল্লাইবার আগে নতুন লট টানো! 🐾", title: "টেইলর বিলাই (মাল শেষ)" };
  }
  if (metrics.safetyPocket >= 500000) {
    return { mood: 'happy', image: getMascotImage('happy'), dialogue: "পুরা ক্যালাও আপু! ক্যাশবাক্সে কড়কড়ে টাকা রেডি! নতুন কাপ্তান বা লট আমদানির টাইম আইসা গেছে, কোপায় দাও মিয়াও! 🧵", title: "টেইলর বিলাই (ক্যালাও)" };
  }
  return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "মিয়াও! ক্যাশবাক্সের অবস্থা সুবিধার না আপু। হাত একটু টান করো, ব্যবসা পুরা লাল বাতি হইয়া যাইবো! 🐾", title: "টেইলর বিলাই (সাবধানী)" };
}

export default function MascotFloating({ metrics, inventoryItems, safetyPocketTarget }: MascotFloatingProps) {
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const mascot = getMascotConfig(metrics, inventoryItems, safetyPocketTarget);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleTap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpanded(true);
    timerRef.current = setTimeout(() => setExpanded(false), 5000);
  };

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {expanded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-[#fceec7] rounded-2xl border-[3px] border-black p-3 shadow-neobrutal max-w-[260px]"
        >
          <p className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-purple-600">
            {mascot.title}
          </p>
          <p className="mt-1 text-[11px] font-sans font-semibold text-black leading-snug">
            {mascot.dialogue}
          </p>
        </motion.div>
      )}
      <button
        onClick={handleTap}
        className="w-12 h-12 rounded-full border-[3px] border-black overflow-hidden bg-[#fceec7] shadow-neobrutal-sm hover:shadow-neobrutal transition-all active:translate-x-[1px] active:translate-y-[1px] shrink-0"
      >
        <img src={mascot.image} alt={mascot.title} className="w-full h-full object-cover" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 5: Create `src/components/metrics/HeroMetric.tsx`

The Safety Pocket hero card — large number, progress bar, alert state.

**Files:**
- Create: `src/components/metrics/HeroMetric.tsx`

- [ ] **Step 1: Write the HeroMetric component**

```tsx
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

interface HeroMetricProps {
  safetyPocket: number;
  safetyPocketTarget: number;
  formatCurrency: (n: number) => string;
}

export default function HeroMetric({ safetyPocket, safetyPocketTarget, formatCurrency }: HeroMetricProps) {
  const isBelowTarget = safetyPocket < safetyPocketTarget;
  const isNegative = safetyPocket <= 0;

  let bgClass = 'bg-yellow-200';
  let borderClass = 'border-black';
  if (isNegative) { bgClass = 'bg-red-300'; }
  else if (isBelowTarget) { bgClass = 'bg-orange-200'; }
  else { bgClass = 'bg-green-200'; }

  return (
    <section className={`${bgClass} rounded-2xl border-[3px] ${borderClass} p-5 shadow-neobrutal-sm animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">
          Safety Pocket
        </span>
        <Wallet className="w-5 h-5 text-black stroke-[2.5px]" />
      </div>

      <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-black block">
        {formatCurrency(safetyPocket)}
      </span>

      <div className="mt-3">
        <ProgressBar
          current={safetyPocket}
          target={safetyPocketTarget}
          formatValue={formatCurrency}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {isNegative ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-red-800">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" /> Critical — below zero
          </span>
        ) : isBelowTarget ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-orange-800">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" /> Below target — limit spending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" /> On track — target met
          </span>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 6: Create `src/components/metrics/RevenueSection.tsx`

**Files:**
- Create: `src/components/metrics/RevenueSection.tsx`

- [ ] **Step 1: Write the RevenueSection component**

```tsx
import { Scissors, Shirt, TrendingUp } from 'lucide-react';
import MiniBarChart from './MiniBarChart';

interface RevenueSectionProps {
  tailoringNet: number;
  clothingNet: number;
  totalBusinessProfit: number;
  formatCurrency: (n: number) => string;
}

export default function RevenueSection({
  tailoringNet,
  clothingNet,
  totalBusinessProfit,
  formatCurrency,
}: RevenueSectionProps) {
  return (
    <section className="bg-amber-100 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">
          Revenue
        </span>
        <TrendingUp className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm min-h-[80px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider">Tailoring</span>
            <Scissors className="w-3.5 h-3.5 stroke-[2.5px]" />
          </div>
          <span className="font-display text-base font-extrabold tracking-tight block mt-1">
            {formatCurrency(tailoringNet)}
          </span>
        </div>
        <div className="bg-amber-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm min-h-[80px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider">Clothing</span>
            <Shirt className="w-3.5 h-3.5 stroke-[2.5px]" />
          </div>
          <span className="font-display text-base font-extrabold tracking-tight block mt-1">
            {formatCurrency(clothingNet)}
          </span>
        </div>
      </div>

      <MiniBarChart
        bars={[
          { label: 'Tailor', value: tailoringNet, color: '#d97706' },
          { label: 'Clothing', value: clothingNet, color: '#0284c7' },
        ]}
        formatValue={formatCurrency}
        height={48}
      />

      <div className="bg-white rounded-xl border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
        <span className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-slate-700">
          Total Profit
        </span>
        <span className="font-display text-base font-extrabold tracking-tight text-black">
          {formatCurrency(totalBusinessProfit)}
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 7: Create `src/components/metrics/CashPositionSection.tsx`

**Files:**
- Create: `src/components/metrics/CashPositionSection.tsx`

- [ ] **Step 1: Write the CashPositionSection component**

```tsx
import { Wallet, TrendingUp } from 'lucide-react';

interface CashPositionSectionProps {
  safetyPocket: number;
  safetyPocketTarget: number;
  formatCurrency: (n: number) => string;
}

export default function CashPositionSection({
  safetyPocket,
  safetyPocketTarget,
  formatCurrency,
}: CashPositionSectionProps) {
  const buffer = safetyPocketTarget > 0 ? Math.round((safetyPocket / safetyPocketTarget) * 100) : 0;

  return (
    <section className="bg-purple-100 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">
          Cash Position
        </span>
        <Wallet className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
      </div>

      <div className="bg-purple-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider">Safety Pocket</span>
          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5px]" />
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight block mt-1">
          {formatCurrency(safetyPocket)}
        </span>
      </div>

      <div className="bg-white rounded-xl border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-slate-700">
            Target Health
          </span>
          <span className={`text-[9px] font-sans font-extrabold uppercase tracking-wider ${buffer >= 100 ? 'text-green-700' : buffer <= 0 ? 'text-red-700' : 'text-orange-700'}`}>
            {buffer >= 100 ? 'Exceeded' : buffer <= 0 ? 'Critical' : `${buffer}%`}
          </span>
        </div>
        <div className="flex justify-between text-[9px] font-sans font-bold text-slate-600">
          <span>{formatCurrency(safetyPocket)} current</span>
          <span>{formatCurrency(safetyPocketTarget)} target</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 8: Create `src/components/metrics/StockHealthSection.tsx`

**Files:**
- Create: `src/components/metrics/StockHealthSection.tsx`

- [ ] **Step 1: Write the StockHealthSection component**

```tsx
import { Layers, Package, TrendingUp } from 'lucide-react';
import MiniBarChart from './MiniBarChart';

interface StockHealthSectionProps {
  totalAvailableStock: number;
  totalSoldQuantity: number;
  totalRemainingStock: number;
  formatNumber: (n: number) => string;
}

export default function StockHealthSection({
  totalAvailableStock,
  totalSoldQuantity,
  totalRemainingStock,
  formatNumber,
}: StockHealthSectionProps) {
  const soldPct = totalAvailableStock > 0 ? Math.round((totalSoldQuantity / totalAvailableStock) * 100) : 0;

  return (
    <section className="bg-teal-100 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">
          Stock Health
        </span>
        <Package className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-teal-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm min-h-[75px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[7px] font-sans font-extrabold uppercase tracking-wider">Available</span>
            <Layers className="w-3 h-3 stroke-[2.5px]" />
          </div>
          <span className="font-display text-sm font-extrabold tracking-tight block mt-1">
            {formatNumber(totalAvailableStock)}
          </span>
        </div>
        <div className="bg-teal-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm min-h-[75px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[7px] font-sans font-extrabold uppercase tracking-wider">Sold</span>
            <TrendingUp className="w-3 h-3 stroke-[2.5px]" />
          </div>
          <span className="font-display text-sm font-extrabold tracking-tight block mt-1">
            {formatNumber(totalSoldQuantity)}
          </span>
        </div>
        <div className="bg-teal-200 rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm min-h-[75px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[7px] font-sans font-extrabold uppercase tracking-wider">Remaining</span>
            <Package className="w-3 h-3 stroke-[2.5px]" />
          </div>
          <span className="font-display text-sm font-extrabold tracking-tight block mt-1">
            {formatNumber(totalRemainingStock)}
          </span>
        </div>
      </div>

      <MiniBarChart
        bars={[
          { label: 'Sold', value: totalSoldQuantity, color: '#0d9488' },
          { label: 'Remain', value: totalRemainingStock, color: '#2dd4bf' },
        ]}
        formatValue={(n) => `${formatNumber(n)}`}
        height={40}
      />

      <div className="bg-white rounded-xl border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
        <span className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-slate-700">
          Sell-through Rate
        </span>
        <span className="font-display text-sm font-extrabold tracking-tight text-black">
          {soldPct}%
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 9: Create `src/components/metrics/CompactStockList.tsx`

**Files:**
- Create: `src/components/metrics/CompactStockList.tsx`

- [ ] **Step 1: Write the CompactStockList component**

```tsx
import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { calculatePreferredPrice } from '../../lib/math/pricing';
import type { InventoryItemRecord } from '../../db/types';

interface CompactStockListProps {
  items: InventoryItemRecord[];
  targetMarkup: number;
  onSellClick: (item: InventoryItemRecord) => void;
  formatCurrency: (n: number) => string;
}

export default function CompactStockList({ items, targetMarkup, onSellClick, formatCurrency }: CompactStockListProps) {
  const topSelling = useMemo(() => {
    return [...items]
      .sort((a, b) => (b.initialQuantity - b.quantity) - (a.initialQuantity - a.quantity))
      .slice(0, 5);
  }, [items]);

  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-[10px] font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-black" /> Active Stock
        </h2>
        <span className="text-[9px] font-sans font-bold text-slate-500">
          {items.length} batch{items.length !== 1 ? 'es' : ''}{items.length > 5 ? ' (top 5)' : ''}
        </span>
      </div>

      <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden divide-y-2 divide-black shadow-neobrutal-sm max-h-[320px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            <Package className="w-6 h-6 mx-auto mb-1 opacity-50 text-black" />
            No stock batches yet
          </div>
        ) : (
          topSelling.map((item) => {
            const sold = item.initialQuantity - item.quantity;
            const isOutOfStock = item.quantity === 0;
            const isLowStock = item.quantity <= 3 && !isOutOfStock;
            const preferredPrice = calculatePreferredPrice(item.trueCost, targetMarkup);

            let badgeClass = 'bg-green-400';
            if (isOutOfStock) badgeClass = 'bg-red-400';
            else if (isLowStock) badgeClass = 'bg-yellow-300';

            return (
              <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-yellow-50/20 transition-colors">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-sans font-bold text-black truncate">{item.brand}</h3>
                    <span className={`text-[8px] font-sans font-bold px-1.5 py-0.5 rounded-md border-2 border-black ${badgeClass} uppercase tracking-wider shrink-0`}>
                      {item.initialQuantity}/{item.quantity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full border border-black overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOutOfStock ? 'bg-red-400' : 'bg-teal-400'}`}
                        style={{ width: `${item.initialQuantity > 0 ? (sold / item.initialQuantity) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-mono font-bold text-slate-600 w-8 text-right">{sold}/{item.initialQuantity}</span>
                  </div>

                  <div className="flex gap-3 text-[10px] font-mono text-slate-600">
                    <span>True: <strong className="text-black">{formatCurrency(item.trueCost)}</strong></span>
                    <span>Sell: <strong className="text-purple-600">{formatCurrency(preferredPrice)}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onSellClick(item)}
                  disabled={isOutOfStock}
                  className={`min-h-[36px] min-w-[64px] px-3 py-1.5 text-[10px] font-sans font-bold rounded-xl transition-all flex items-center justify-center border-2 border-black uppercase tracking-wider shrink-0 ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-purple-600 hover:bg-purple-700 active:translate-x-[1px] active:translate-y-[1px] text-white shadow-neobrutal-sm'
                  }`}
                >
                  Sell
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 10: Rewrite `src/components/DashboardView.tsx` as orchestrator

Replace the monolithic DashboardView with a thin orchestrator that composes all new sub-components.

**Files:**
- Modify: `src/components/DashboardView.tsx` (full rewrite)

- [ ] **Step 1: Replace DashboardView.tsx**

```tsx
import { motion } from 'motion/react';
import { formatCurrency } from '../lib/math/rounding';
import type { DashboardMetrics, InventoryItemRecord } from '../db/types';

import HeroMetric from './metrics/HeroMetric';
import RevenueSection from './metrics/RevenueSection';
import CashPositionSection from './metrics/CashPositionSection';
import StockHealthSection from './metrics/StockHealthSection';
import CompactStockList from './metrics/CompactStockList';
import MascotFloating from './metrics/MascotFloating';
import EmptyDashboard from './metrics/EmptyDashboard';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  inventoryItems: InventoryItemRecord[];
  onSellClick: (item: InventoryItemRecord) => void;
  safetyPocketTarget: number;
  targetMarkup: number;
}

export default function DashboardView({
  metrics,
  inventoryItems,
  onSellClick,
  safetyPocketTarget,
  targetMarkup,
}: DashboardViewProps) {
  const hasData = inventoryItems.length > 0 && metrics.totalBusinessProfit !== 0;

  if (!hasData) {
    return <EmptyDashboard />;
  }

  const formatFn = (n: number) => formatCurrency(n);
  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4 pb-20">
      <div className="animate-fade-in">
        <HeroMetric
          safetyPocket={metrics.safetyPocket}
          safetyPocketTarget={safetyPocketTarget}
          formatCurrency={formatFn}
        />
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <RevenueSection
            tailoringNet={metrics.tailoringNet}
            clothingNet={metrics.clothingNet}
            totalBusinessProfit={metrics.totalBusinessProfit}
            formatCurrency={formatFn}
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <CashPositionSection
            safetyPocket={metrics.safetyPocket}
            safetyPocketTarget={safetyPocketTarget}
            formatCurrency={formatFn}
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StockHealthSection
          totalAvailableStock={metrics.totalAvailableStock}
          totalSoldQuantity={metrics.totalSoldQuantity}
          totalRemainingStock={metrics.totalRemainingStock}
          formatNumber={formatNum}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CompactStockList
          items={inventoryItems}
          targetMarkup={targetMarkup}
          onSellClick={onSellClick}
          formatCurrency={formatFn}
        />
      </motion.div>

      <MascotFloating
        metrics={metrics}
        inventoryItems={inventoryItems}
        safetyPocketTarget={safetyPocketTarget}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

### Task 11: Remove unused imports from `src/App.tsx`

When DashboardView no longer needs certain imports passed through or used, clean them up. DashboardView's interface hasn't changed — same props — so App.tsx likely requires no changes. But verify.

- [ ] **Step 1: Check if App.tsx needs changes**

The `DashboardViewProps` interface is unchanged (same props, same types), so App.tsx should pass props identically.

Run: `npx tsc --noEmit`
Expected: No errors, no changes needed

---

### Task 12: Verify the build

- [ ] **Step 1: Build the project**

Run: `npx vite build`
Expected: No errors, build succeeds

- [ ] **Step 2: Spot-check the result**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Self-Review

**Spec coverage:**
1. Narrative grouping (Revenue, Cash Position, Stock Health) — Tasks 6, 7, 8
2. Visual hierarchy (hero 2× weight, compact cards) — Task 5 (hero), Tasks 6-8 (compact cards)
3. Safety Pocket progress bar — Tasks 1, 5
4. Inline SVG charts (Revenue bar, Stock bar) — Tasks 2, 6, 8
5. Floating mascot — Task 4
6. Compact stock list with inline sparkline + scroll — Task 9
7. Staggered entrance animations — Task 10 (motion.div variants)
8. Empty state — Task 3
9. Responsive grid (1-col → 2-col on md+) — Task 10 (grid-cols-1 md:grid-cols-2)
10. Section-based color palette (amber, purple, teal) — Tasks 6, 7, 8

**Placeholder check:** No placeholders, no TBD, no "add error handling" without code, no dangling references.

**Type consistency:**
- `DashboardMetrics` type from `src/db/types.ts` is imported and used consistently across all components
- `InventoryItemRecord` type from `src/db/types.ts` used in CompactStockList and MascotFloating
- `formatCurrency` from `src/lib/math/rounding.ts` used consistently
- `calculatePreferredPrice` from `src/lib/math/pricing.ts` used in CompactStockList
- All prop interfaces defined and used in their respective components
- `InventoryItemRecord` = `{ id, shipmentId, brand, quantity, initialQuantity, wholesaleCost, trueCost }` — all references match

---

**Plan complete. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh agent per task, review between tasks, fast iteration with isolated context per component
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review

Which approach?
