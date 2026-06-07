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
