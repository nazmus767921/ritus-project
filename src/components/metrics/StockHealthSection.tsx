import { Layers, Package, TrendingUp } from 'lucide-react';

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
