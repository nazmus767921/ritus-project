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
