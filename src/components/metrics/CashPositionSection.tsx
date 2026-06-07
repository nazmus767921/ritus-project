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
