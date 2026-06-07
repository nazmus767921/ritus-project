interface BarItem {
  label: string;
  value: number;
  color: string;
}

interface MiniBarChartProps {
  bars: BarItem[];
  formatValue: (n: number) => string;
  height?: number;
}

export default function MiniBarChart({ bars, formatValue, height = 64 }: MiniBarChartProps) {
  const maxValue = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="bg-white rounded-xl border-[3px] border-black p-3 shadow-neobrutal-sm">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${bars.length * 60} ${height}`}
        className="overflow-visible"
      >
        {bars.map((bar, i) => {
          const barHeight = (bar.value / maxValue) * (height - 20);
          const x = i * 60 + 8;
          const y = height - 10 - barHeight;
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={28}
                height={barHeight}
                rx={4}
                fill={bar.color}
                stroke="black"
                strokeWidth={2}
                className="transition-all duration-500"
              />
              <text
                x={x + 14}
                y={height - 2}
                textAnchor="middle"
                className="fill-slate-700 text-[8px] font-sans font-bold uppercase"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
