import { useState, useMemo, useEffect } from 'react';
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
  const [page, setPage] = useState(0);

  // Price range slider state (values in Taka)
  const priceBounds = useMemo(() => {
    if (inventoryItems.length === 0) return { min: 0, max: 1000 };
    const costs = inventoryItems.map(i => Math.round(i.wholesaleCost / 100));
    return {
      min: Math.min(...costs),
      max: Math.max(...costs)
    };
  }, [inventoryItems]);

  const [minPrice, setMinPrice] = useState(priceBounds.min);
  const [maxPrice, setMaxPrice] = useState(priceBounds.max);

  useEffect(() => {
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    if (brandQuery.trim()) {
      const q = brandQuery.toLowerCase();
      items = items.filter(item => item.brand.toLowerCase().includes(q));
    }

    const minPoisha = minPrice * 100;
    const maxPoisha = maxPrice * 100;
    items = items.filter(item => item.wholesaleCost >= minPoisha && item.wholesaleCost <= maxPoisha);

    return items;
  }, [inventoryItems, brandQuery, minPrice, maxPrice]);

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
        {/* Price Range Slider */}
        {inventoryItems.length > 0 && (
          <div className="bg-white border-2 border-black rounded-xl p-3 shadow-neobrutal-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-sans font-bold text-slate-700 uppercase tracking-wider">Wholesale Range</span>
              <span className="text-[10px] font-mono font-bold text-black">
                ৳{minPrice} — ৳{maxPrice}
              </span>
            </div>
            <div className="relative h-6">
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-slate-200 rounded-full border border-black" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-2 bg-purple-400 rounded-full border border-black"
                style={{
                  left: `${((minPrice - priceBounds.min) / Math.max(priceBounds.max - priceBounds.min, 1)) * 100}%`,
                  width: `${((maxPrice - minPrice) / Math.max(priceBounds.max - priceBounds.min, 1)) * 100}%`
                }}
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={minPrice}
                step={10}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val <= maxPrice) {
                    setMinPrice(val);
                    setPage(0);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-none z-10
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                  [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                value={maxPrice}
                step={10}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= minPrice) {
                    setMaxPrice(val);
                    setPage(0);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-none z-10
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto
                  [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto
                  [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                  [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black
                  [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>
          </div>
        )}
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
