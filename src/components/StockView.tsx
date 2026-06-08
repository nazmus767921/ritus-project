import { useState, useMemo } from 'react';
import { Package, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/math/rounding';
import type { InventoryItemRecord } from '../db/types';

interface StockViewProps {
  inventoryItems: InventoryItemRecord[];
  onSellClick: (item: InventoryItemRecord) => void;
}

export default function StockView({ inventoryItems, onSellClick }: StockViewProps) {
  const [brandQuery, setBrandQuery] = useState('');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Group items by brand, filtered by search
  const brandGroups = useMemo(() => {
    let items = inventoryItems;

    if (brandQuery.trim()) {
      const q = brandQuery.toLowerCase();
      items = items.filter(item => item.brand.toLowerCase().includes(q));
    }

    const groups: Record<string, InventoryItemRecord[]> = {};
    for (const item of items) {
      if (!groups[item.brand]) groups[item.brand] = [];
      groups[item.brand].push(item);
    }

    // Sort brands alphabetically, items within each brand by ID ascending
    for (const brand of Object.keys(groups)) {
      groups[brand].sort((a, b) => a.id - b.id);
    }

    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([brand, items]) => ({
      brand,
      items,
      totalUnits: items.reduce((sum, i) => sum + i.quantity, 0),
      totalInitial: items.reduce((sum, i) => sum + i.initialQuantity, 0),
      oldestBatch: items[0]
    }));
  }, [inventoryItems, brandQuery]);

  const totalItemCount = inventoryItems.length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by brand..."
          value={brandQuery}
          onChange={(e) => setBrandQuery(e.target.value)}
          className="w-full bg-white border-2 border-black rounded-xl py-2 pl-3 pr-3 font-mono text-xs text-black focus:outline-none min-h-[36px]"
        />
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Package className="w-4 h-4 text-black" /> Stock by Brand
        </h2>
        <span className="text-xs font-sans font-bold text-slate-600">
          {brandGroups.length} brand{brandGroups.length !== 1 ? 's' : ''}
        </span>
      </div>

      {brandGroups.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-black p-12 text-center text-slate-500 text-sm shadow-neobrutal-sm">
          <Package className="w-10 h-10 mx-auto mb-3 text-black opacity-60" />
          <p className="font-sans font-bold text-black text-base uppercase">
            {totalItemCount === 0 ? 'No Stock Items Logged' : 'No brands match your search.'}
          </p>
          <p className="mt-2 text-xs text-slate-600">Tap the "+" button below to import a shipment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {brandGroups.map((group) => {
            const isExpanded = expandedBrand === group.brand;

            return (
              <div key={group.brand} className="bg-white rounded-xl border-2 border-black overflow-hidden shadow-neobrutal-sm">
                {/* Brand Header */}
                <button
                  type="button"
                  onClick={() => setExpandedBrand(isExpanded ? null : group.brand)}
                  className="w-full p-4 flex items-center gap-3 min-h-[56px] cursor-pointer text-left hover:bg-yellow-50/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0 text-purple-600 stroke-[3px]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-500 stroke-[3px]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-sans font-bold text-black truncate">{group.brand}</h3>
                    <p className="text-[10px] font-sans text-slate-500">
                      {group.totalUnits} unit{group.totalUnits !== 1 ? 's' : ''} across {group.items.length} batch{group.items.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span className={`text-[9px] font-sans font-bold px-2 py-1 rounded-md border-2 border-black uppercase tracking-wider shrink-0 ${
                    group.totalUnits <= 3
                      ? 'bg-yellow-300 text-black'
                      : group.totalUnits === 0
                      ? 'bg-red-400 text-black'
                      : 'bg-green-400 text-black'
                  }`}>
                    {group.totalUnits} left
                  </span>
                </button>

                {/* Expandable Batch Details */}
                {isExpanded && (
                  <div className="border-t-2 border-black divide-y-2 divide-black">
                    {group.items.map((item) => {
                      const isOldestAndAvailable = item.id === group.oldestBatch?.id && item.quantity > 0;

                      return (
                        <div key={item.id} className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-sans font-bold text-slate-600">Batch #{item.id}</span>
                              {isOldestAndAvailable && (
                                <span className="text-[8px] font-sans font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300 uppercase tracking-wider">
                                  FIFO
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                              <div>
                                <span className="text-slate-500 block font-sans font-bold text-[7px] uppercase">Wholesale</span>
                                <span className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-sans font-bold text-[7px] uppercase">True Cost</span>
                                <span className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-sans font-bold text-[7px] uppercase">Remaining</span>
                                <span className="text-black font-extrabold">{item.quantity}/{item.initialQuantity}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => onSellClick(item)}
                            disabled={item.quantity === 0}
                            className={`text-[9px] font-sans font-bold uppercase px-3 py-1.5 rounded-lg border-2 border-black min-h-[32px] transition-all ${
                              item.quantity === 0
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-50'
                                : 'bg-purple-600 text-white hover:bg-purple-700 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer'
                            }`}
                          >
                            Sell
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
