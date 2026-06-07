interface ProgressBarProps {
  current: number;
  target: number;
  formatValue: (n: number) => string;
}

export default function ProgressBar({ current, target, formatValue }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isExceeded = target > 0 && current >= target;
  const isCritical = current <= 0;

  let barColor = 'bg-yellow-400';
  if (isExceeded) barColor = 'bg-green-400';
  else if (isCritical) barColor = 'bg-red-400';
  else if (pct > 75) barColor = 'bg-orange-400';

  return (
    <div className="space-y-1.5">
      <div className="relative h-4 bg-white rounded-full border-[3px] border-black overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute right-0 top-0 h-full w-0.5 bg-black opacity-50" />
      </div>
      <div className="flex justify-between text-[9px] font-sans font-bold uppercase tracking-wider text-slate-700">
        <span>{formatValue(current)} current</span>
        <span>{formatValue(target)} target</span>
      </div>
    </div>
  );
}
