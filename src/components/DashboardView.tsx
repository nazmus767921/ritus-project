import { motion } from 'motion/react';
import type { DashboardMetrics, InventoryItemRecord } from '../db/types';
import HeroMetric from './metrics/HeroMetric';
import RevenueSection from './metrics/RevenueSection';
import CashPositionSection from './metrics/CashPositionSection';
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

  const totalAvailableStock = inventoryItems.reduce((sum, item) => sum + item.initialQuantity, 0);
  const totalSoldQuantity = inventoryItems.reduce((sum, item) => sum + (item.initialQuantity - item.quantity), 0);
  const totalRemainingStock = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-4 pb-20">
      <div className="animate-fade-in">
        <HeroMetric
          safetyPocket={metrics.safetyPocket}
          safetyPocketTarget={safetyPocketTarget}
          formatCurrency={formatCurrency}
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
            formatCurrency={formatCurrency}
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
          <CashPositionSection
            safetyPocket={metrics.safetyPocket}
            safetyPocketTarget={safetyPocketTarget}
            formatCurrency={formatCurrency}
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StockHealthSection
          totalAvailableStock={totalAvailableStock}
          totalSoldQuantity={totalSoldQuantity}
          totalRemainingStock={totalRemainingStock}
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
          formatCurrency={formatCurrency}
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
