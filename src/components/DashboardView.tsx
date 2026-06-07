import { motion } from 'motion/react';
import type { DashboardMetrics, InventoryItemRecord } from '../db/types';
import HeroMetric from './metrics/HeroMetric';
import RevenueSection from './metrics/RevenueSection';
import StockHealthSection from './metrics/StockHealthSection';
import CompactStockList from './metrics/CompactStockList';
import MascotFloating from './metrics/MascotFloating';
import EmptyDashboard from './metrics/EmptyDashboard';

const formatCurrency = (amountInPoisha: number) => {
  const taka = amountInPoisha / 100;
  const sign = taka < 0 ? '-' : '';
  return `${sign}৳${Math.abs(taka).toFixed(2)}`;
};

interface DashboardViewProps {
  metrics: DashboardMetrics;
  inventoryItems: InventoryItemRecord[];
  onSellClick: (item: InventoryItemRecord) => void;
  safetyPocketTarget: number;
  targetMarkup: number;
  showMascot?: boolean;
}

export default function DashboardView({
  metrics,
  inventoryItems,
  onSellClick,
  safetyPocketTarget,
  targetMarkup,
  showMascot = true,
}: DashboardViewProps) {
  const hasData = inventoryItems.length > 0 && metrics.totalBusinessProfit !== 0;

  if (!hasData) {
    return <EmptyDashboard />;
  }

  const totalAvailableStock = inventoryItems.reduce((sum, item) => sum + item.initialQuantity, 0);
  const totalSoldQuantity = inventoryItems.reduce((sum, item) => sum + (item.initialQuantity - item.quantity), 0);
  const totalRemainingStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="flex flex-col min-h-0 flex-1 space-y-4 pb-20">
      <div className="animate-fade-in shrink-0">
        <HeroMetric
          safetyPocket={metrics.safetyPocket}
          safetyPocketTarget={safetyPocketTarget}
          formatCurrency={formatCurrency}
        />
      </div>

      <motion.div
        className="shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <RevenueSection
          tailoringNet={metrics.tailoringNet}
          clothingNet={metrics.clothingNet}
          totalBusinessProfit={metrics.totalBusinessProfit}
          formatCurrency={formatCurrency}
        />
      </motion.div>

      <motion.div
        className="shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <StockHealthSection
          totalAvailableStock={totalAvailableStock}
          totalSoldQuantity={totalSoldQuantity}
          totalRemainingStock={totalRemainingStock}
          formatNumber={formatNum}
        />
      </motion.div>

      <motion.div
        className="flex flex-col flex-1 min-h-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
      >
        <CompactStockList
          items={inventoryItems}
          targetMarkup={targetMarkup}
          onSellClick={onSellClick}
          formatCurrency={formatCurrency}
        />
      </motion.div>

      <MascotFloating
        metrics={metrics}
        inventoryItems={inventoryItems}
        safetyPocketTarget={safetyPocketTarget}
        visible={showMascot}
      />
    </div>
  );
}
