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
