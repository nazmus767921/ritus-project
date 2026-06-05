import { Scissors, Shirt, TrendingUp, Wallet, Package } from 'lucide-react';

interface DashboardViewProps {
  metrics: {
    tailoringNet: number;
    clothingNet: number;
    totalBusinessProfit: number;
    safetyPocket: number;
  };
  inventoryItems: {
    id: number;
    brand: string;
    wholesaleCost: number;
    trueCost: number;
    quantity: number;
  }[];
  onSellClick: (item: any) => void;
}

export default function DashboardView({ metrics, inventoryItems, onSellClick }: DashboardViewProps) {
  // Format Poisha to Taka helper
  const formatCurrency = (amountInPoisha: number) => {
    const taka = amountInPoisha / 100;
    const sign = taka < 0 ? '-' : '';
    return `${sign}৳${Math.abs(taka).toFixed(2)}`;
  };

  const metricCards = [
    {
      label: 'Tailoring Net',
      value: metrics.tailoringNet,
      icon: Scissors,
      isProfit: metrics.tailoringNet >= 0,
      description: 'Service fees minus expenses'
    },
    {
      label: 'Clothing Net',
      value: metrics.clothingNet,
      icon: Shirt,
      isProfit: metrics.clothingNet >= 0,
      description: 'Retail sales minus overhead'
    },
    {
      label: 'Total Business Profit',
      value: metrics.totalBusinessProfit,
      icon: TrendingUp,
      isProfit: metrics.totalBusinessProfit >= 0,
      description: 'Combined business income'
    },
    {
      label: 'Safety Pocket',
      value: metrics.safetyPocket,
      icon: Wallet,
      isProfit: metrics.safetyPocket >= 0,
      description: 'Profit minus personal spent'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 2x2 Metrics Grid */}
      <section className="grid grid-cols-2 gap-4">
        {metricCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between min-h-[120px] transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <IconComponent className={`w-4 h-4 shrink-0 ${card.isProfit ? 'text-emerald-500' : 'text-red-500'}`} />
              </div>
              <div className="mt-2.5 space-y-1">
                <span className={`font-mono text-base sm:text-lg font-bold tracking-tight block ${
                  card.isProfit ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatCurrency(card.value)}
                </span>
                <span className="text-[10px] text-slate-400 font-medium leading-tight block">
                  {card.description}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Active Stock List Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4" /> Active Stock Items
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            Total Batches: {inventoryItems.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
          {inventoryItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No inventory batches logged yet. Go to the Inventory tab to import a shipment.
            </div>
          ) : (
            inventoryItems.map((item) => {
              // Badge configuration based on stock count
              let badgeClass = '';
              let badgeLabel = '';
              const isOutOfStock = item.quantity === 0;

              if (isOutOfStock) {
                badgeClass = 'bg-red-50 text-red-700 border-red-200';
                badgeLabel = 'Out of Stock';
              } else if (item.quantity <= 3) {
                badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                badgeLabel = `${item.quantity} left`;
              } else {
                badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                badgeLabel = `${item.quantity} in Stock`;
              }

              return (
                <div 
                  key={item.id} 
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{item.brand}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} shrink-0`}>
                        {badgeLabel}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                      <span>Wholesale: <strong className="text-slate-700">৳{(item.wholesaleCost / 100).toFixed(2)}</strong></span>
                      <span>True Cost: <strong className="text-emerald-700">৳{(item.trueCost / 100).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSellClick(item)}
                    disabled={isOutOfStock}
                    className={`min-h-[44px] min-w-[70px] px-3.5 py-2 text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center border ${
                      isOutOfStock
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white border-transparent shadow-xs'
                    }`}
                  >
                    Sell
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
