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
      bgClass: 'bg-green-300',
      description: 'Service fees minus expenses'
    },
    {
      label: 'Clothing Net',
      value: metrics.clothingNet,
      icon: Shirt,
      bgClass: 'bg-cyan-200',
      description: 'Retail sales minus overhead'
    },
    {
      label: 'Total Business Profit',
      value: metrics.totalBusinessProfit,
      icon: TrendingUp,
      bgClass: 'bg-yellow-200',
      description: 'Combined business income'
    },
    {
      label: 'Safety Pocket',
      value: metrics.safetyPocket,
      icon: Wallet,
      bgClass: 'bg-purple-300',
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
              className={`${card.bgClass} text-black rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm flex flex-col justify-between min-h-[130px] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neobrutal select-none`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] sm:text-xs font-sans font-extrabold uppercase tracking-wider text-black leading-tight">
                  {card.label}
                </span>
                <IconComponent className="w-4.5 h-4.5 shrink-0 text-black stroke-[2.5px]" />
              </div>
              <div className="mt-2.5 space-y-1">
                <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight block text-black">
                  {formatCurrency(card.value)}
                </span>
                <span className="text-[9px] text-slate-800 font-bold leading-tight block uppercase">
                  {card.description}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Active Stock List Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-black" /> Active Stock Items
          </h2>
          <span className="text-xs font-sans font-bold text-slate-600">
            Total Batches: {inventoryItems.length}
          </span>
        </div>

        <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden divide-y-2 divide-black shadow-neobrutal-sm">
          {inventoryItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50 text-black" />
              No inventory batches logged yet. Go to the Inventory tab to import a shipment.
            </div>
          ) : (
            inventoryItems.map((item) => {
              // Badge configuration based on stock count
              let badgeClass = '';
              let badgeLabel = '';
              const isOutOfStock = item.quantity === 0;

              if (isOutOfStock) {
                badgeClass = 'bg-red-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = 'Out of Stock';
              } else if (item.quantity <= 3) {
                badgeClass = 'bg-yellow-300 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = `${item.quantity} left`;
              } else {
                badgeClass = 'bg-green-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = `${item.quantity} in Stock`;
              }

              return (
                <div 
                  key={item.id} 
                  className="p-4 flex items-center justify-between gap-4 hover:bg-yellow-50/20 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-sans font-bold text-black truncate">{item.brand}</h3>
                      <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-md border-2 ${badgeClass} uppercase tracking-wider shrink-0`}>
                        {badgeLabel}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[11px] font-mono text-slate-700">
                      <span>Wholesale: <strong className="text-black font-extrabold">৳{(item.wholesaleCost / 100).toFixed(2)}</strong></span>
                      <span>True Cost: <strong className="text-green-600 font-extrabold">৳{(item.trueCost / 100).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSellClick(item)}
                    disabled={isOutOfStock}
                    className={`min-h-[44px] min-w-[76px] px-4 py-2 text-xs font-sans font-bold rounded-xl transition-all flex items-center justify-center border-2 border-black uppercase tracking-wider ${
                      isOutOfStock
                        ? 'bg-slate-200 text-slate-500 border-black cursor-not-allowed opacity-50'
                        : 'bg-purple-600 hover:bg-purple-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-white shadow-neobrutal-sm'
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
