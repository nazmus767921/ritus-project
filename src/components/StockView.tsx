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
  const safePage = Math.min(page, totalPages - 1);

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
