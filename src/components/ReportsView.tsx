import { TrendingUp, DollarSign, Percent, BarChart3, AlertCircle } from 'lucide-react';
import { calculatePreferredPrice, calculateProfitMargin } from '../lib/math/pricing';
import { formatCurrency } from '../lib/math/rounding';
import type { TransactionRecord, InventoryItemRecord } from '../db/types';

interface ReportsViewProps {
  transactions: TransactionRecord[];
  inventoryItems: InventoryItemRecord[];
  targetMarkup: number;
}

export default function ReportsView({ transactions, inventoryItems, targetMarkup }: ReportsViewProps) {

  const itemMap = new Map(inventoryItems.map(item => [item.id, item]));

  // 1. KPI Calculations
  const activeTx = transactions.filter(t => t.status === 'active');

  const totalInflow = activeTx
    .filter(t => t.category === 'tailoring_income' || t.category === 'clothing_income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = activeTx
    .filter(t => t.category === 'tailoring_expense' || t.category === 'clothing_overhead' || t.category === 'personal_expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Clothing retail specific calculations
  const clothingRevenue = activeTx
    .filter(t => t.category === 'clothing_income')
    .reduce((sum, t) => sum + t.amount, 0);

  const clothingCost = activeTx
    .filter(t => t.category === 'clothing_income' && t.inventoryItemId != null)
    .reduce((sum, t) => {
      const item = itemMap.get(t.inventoryItemId!);
      return sum + (item ? item.trueCost * (t.quantity ?? 1) : 0);
    }, 0);

  const actualMarginVal = calculateProfitMargin(clothingRevenue, clothingCost);

  // Profit expectation meet rate
  const clothingSales = activeTx.filter(t => t.category === 'clothing_income');
  const salesMeetingTarget = clothingSales.filter(t => {
    if (!t.inventoryItemId) return false;
    const item = itemMap.get(t.inventoryItemId);
    if (!item) return false;
    const targetUnitPrice = calculatePreferredPrice(item.trueCost, targetMarkup);
    return t.amount >= targetUnitPrice * (t.quantity ?? 1);
  });

  const validClothingSales = clothingSales.filter(t => t.inventoryItemId && itemMap.has(t.inventoryItemId));
  const meetRate = validClothingSales.length > 0
    ? (salesMeetingTarget.length / validClothingSales.length) * 100
    : 0;

  // 2. Monthly Grouping
  const monthlyData: { 
    [month: string]: { sales: number; profit: number; expenses: number; personal: number; clothingRev: number; clothingCost: number } 
  } = {};

  for (const t of activeTx) {
    const date = new Date(t.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sales: 0, profit: 0, expenses: 0, personal: 0, clothingRev: 0, clothingCost: 0 };
    }

    const item = t.inventoryItemId ? itemMap.get(t.inventoryItemId) : null;

    if (t.category === 'tailoring_income' || t.category === 'clothing_income') {
      monthlyData[monthKey].sales += t.amount;
      if (t.category === 'clothing_income') {
        monthlyData[monthKey].clothingRev += t.amount;
        if (item) {
          monthlyData[monthKey].clothingCost += item.trueCost * (t.quantity ?? 1);
        }
      }
    } else if (t.category === 'tailoring_expense' || t.category === 'clothing_overhead') {
      monthlyData[monthKey].expenses += t.amount;
    } else if (t.category === 'personal_expense') {
      monthlyData[monthKey].personal += t.amount;
    }
  }

  // Calculate net profit per month
  // Consistent with Dashboard Net Business Profit = Tailoring Net + Clothing Net
  // tailoringNet = tailoringIncome - tailoringExpense
  // clothingNet = clothingIncome - clothingOverhead
  // businessProfit = tailoringNet + clothingNet = (tailoringIncome + clothingIncome) - (tailoringExpense + clothingOverhead)
  // which is exactly Monthly Sales - Monthly Expenses
  for (const monthKey of Object.keys(monthlyData)) {
    const m = monthlyData[monthKey];
    m.profit = m.sales - m.expenses;
  }

  const sortedMonths = Object.keys(monthlyData).sort().slice(0, 6); // Last 6 months for chart

  // Build chart elements
  const maxSalesVal = Math.max(...sortedMonths.map(m => monthlyData[m].sales), 10000); // at least 100 Taka limit
  const maxProfitVal = Math.max(...sortedMonths.map(m => Math.max(0, monthlyData[m].profit)), 10000);
  const chartMax = Math.max(maxSalesVal, maxProfitVal);

  const getMonthLabel = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* 3 KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: Inflow vs Outflow */}
        <div className="bg-green-300 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm flex flex-col justify-between min-h-[120px] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">Total Inflow vs Outflow</span>
            <DollarSign className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
          </div>
          <div className="mt-2 space-y-1">
            <span className="font-display text-base sm:text-lg font-extrabold text-black block">
              In: {formatCurrency(totalInflow)}
            </span>
            <span className="text-[10px] text-slate-800 font-bold block uppercase">
              Out: {formatCurrency(totalOutflow)} (incl. Personal)
            </span>
          </div>
        </div>

        {/* KPI 2: Actual Margin */}
        <div className="bg-cyan-200 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm flex flex-col justify-between min-h-[120px] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">Actual Retail Margin</span>
            <Percent className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
          </div>
          <div className="mt-2 space-y-1">
            <span className="font-display text-xl font-extrabold text-black block">
              {(actualMarginVal * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-800 font-bold block uppercase">
              Pricing Markup: {(targetMarkup * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* KPI 3: Expectations Met */}
        <div className="bg-purple-300 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm flex flex-col justify-between min-h-[120px] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-black">Target Price Meet Rate</span>
            <TrendingUp className="w-4.5 h-4.5 text-black stroke-[2.5px]" />
          </div>
          <div className="mt-2 space-y-1">
            <span className="font-display text-xl font-extrabold text-black block">
              {meetRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-800 font-bold block uppercase">
              Sales Meeting Preferred Price
            </span>
          </div>
        </div>
      </section>

      {/* SVG Bar Chart Card */}
      <section className="bg-white rounded-2xl border-[3px] border-black p-5 shadow-neobrutal">
        <h3 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
          <BarChart3 className="w-4.5 h-4.5 text-black" /> Monthly Sales & Net Profit (Last 6 Months)
        </h3>

        {sortedMonths.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-black" />
            No transaction records found to generate charts.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[400px]">
              <svg viewBox="0 0 500 220" className="w-full h-auto overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="#CBD5E1" strokeWidth="1" />

                {/* Y Axis Legend */}
                <text x="32" y="24" className="text-[9px] font-mono font-bold fill-slate-500 text-right" textAnchor="end">
                  ৳{((chartMax * 1.0) / 100).toFixed(0)}
                </text>
                <text x="32" y="74" className="text-[9px] font-mono font-bold fill-slate-500 text-right" textAnchor="end">
                  ৳{((chartMax * 0.7) / 100).toFixed(0)}
                </text>
                <text x="32" y="124" className="text-[9px] font-mono font-bold fill-slate-500 text-right" textAnchor="end">
                  ৳{((chartMax * 0.3) / 100).toFixed(0)}
                </text>
                <text x="32" y="174" className="text-[9px] font-mono font-bold fill-slate-500 text-right" textAnchor="end">
                  ৳0
                </text>
                <text x="480" y="174" className="text-[8px] font-sans fill-slate-400" textAnchor="end">
                  (Taka)
                </text>

                {sortedMonths.map((monthKey, idx) => {
                  const data = monthlyData[monthKey];
                  const colWidth = 440 / sortedMonths.length;
                  const groupX = 40 + idx * colWidth + colWidth / 4;
                  
                  // Heights
                  const salesHeight = chartMax > 0 ? (data.sales / chartMax) * 140 : 0;
                  const profitHeight = chartMax > 0 ? (Math.max(0, data.profit) / chartMax) * 140 : 0;

                  return (
                    <g key={monthKey}>
                      {/* Sales Bar - Green */}
                      <rect
                        x={groupX}
                        y={170 - salesHeight}
                        width="18"
                        height={salesHeight}
                        className="fill-green-400 stroke-[2px] stroke-black"
                      />
                      {/* Profit Bar - Purple */}
                      <rect
                        x={groupX + 22}
                        y={170 - profitHeight}
                        width="18"
                        height={profitHeight}
                        className="fill-purple-600 stroke-[2px] stroke-black"
                      />
                      {/* Label */}
                      <text
                        x={groupX + 20}
                        y="188"
                        className="text-[9px] font-sans font-bold fill-black text-center"
                        textAnchor="middle"
                      >
                        {getMonthLabel(monthKey)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            {/* Chart Legend */}
            <div className="flex gap-4 items-center justify-center mt-3 text-[10px] font-sans font-bold uppercase select-none">
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-green-400 border-2 border-black rounded inline-block"></span>
                <span>Monthly Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 bg-purple-600 border-2 border-black rounded inline-block"></span>
                <span>Monthly Net Business Profit</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Monthly Breakdown Table */}
      <section className="space-y-3">
        <h3 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider">
          Monthly Performance Breakdown
        </h3>
        
        <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden shadow-neobrutal-sm">
          {sortedMonths.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No records available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b-2 border-black font-sans font-bold text-[9px] uppercase tracking-wider">
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Sales</th>
                    <th className="p-3 text-right">Expenses</th>
                    <th className="p-3 text-right">Personal spent</th>
                    <th className="p-3 text-right">Business Net</th>
                    <th className="p-3 text-right">Clothing Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {sortedMonths.map((monthKey) => {
                    const data = monthlyData[monthKey];
                    const clothingMargin = data.clothingRev > 0 
                      ? calculateProfitMargin(data.clothingRev, data.clothingCost) * 100 
                      : 0;

                    return (
                      <tr key={monthKey} className="hover:bg-yellow-50/20 transition-colors">
                        <td className="p-3 font-sans font-bold text-black">{getMonthLabel(monthKey)}</td>
                        <td className="p-3 text-right text-black font-semibold">{formatCurrency(data.sales)}</td>
                        <td className="p-3 text-right text-slate-700">{formatCurrency(data.expenses)}</td>
                        <td className="p-3 text-right text-red-500">{formatCurrency(data.personal)}</td>
                        <td className="p-3 text-right text-green-600 font-extrabold">{formatCurrency(data.profit)}</td>
                        <td className="p-3 text-right text-slate-900 font-bold">
                          {data.clothingRev > 0 ? `${clothingMargin.toFixed(0)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
