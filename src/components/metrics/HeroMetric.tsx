import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

interface HeroMetricProps {
  safetyPocket: number;
  safetyPocketTarget: number;
  formatCurrency: (n: number) => string;
}

export default function HeroMetric({ safetyPocket, safetyPocketTarget, formatCurrency }: HeroMetricProps) {
  const isBelowTarget = safetyPocket < safetyPocketTarget;
  const isNegative = safetyPocket <= 0;

  let bgClass = 'bg-yellow-200';
  if (isNegative) { bgClass = 'bg-red-300'; }
  else if (isBelowTarget) { bgClass = 'bg-orange-200'; }
  else { bgClass = 'bg-green-200'; }

  return (
    <section className={`${bgClass} rounded-2xl border-[3px] border-black p-5 shadow-neobrutal-sm animate-fade-in`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">
          Safety Pocket
        </span>
        <Wallet className="w-5 h-5 text-black stroke-[2.5px]" />
      </div>

      <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-black block">
        {formatCurrency(safetyPocket)}
      </span>

      <div className="mt-3">
        <ProgressBar
          current={safetyPocket}
          target={safetyPocketTarget}
          formatValue={formatCurrency}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {isNegative ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-red-800">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" /> Critical — below zero
          </span>
        ) : isBelowTarget ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-orange-800">
            <AlertCircle className="w-3.5 h-3.5 stroke-[2.5px]" /> Below target — limit spending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5px]" /> On track — target met
          </span>
        )}
      </div>
    </section>
  );
}
