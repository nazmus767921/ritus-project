import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Scissors, Shirt, TrendingUp, Wallet, Package, AlertCircle, Layers } from 'lucide-react';
import { calculatePreferredPrice } from '../lib/math/pricing';
import { formatCurrency } from '../lib/math/rounding';
import type { DashboardMetrics, InventoryItemRecord } from '../db/types';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  inventoryItems: InventoryItemRecord[];
  onSellClick: (item: InventoryItemRecord) => void;
  safetyPocketTarget: number;
  targetMarkup: number;
}

export default function DashboardView({
  metrics,
  inventoryItems,
  onSellClick,
  safetyPocketTarget,
  targetMarkup
}: DashboardViewProps) {


  const formatNumber = (n: number) => n.toLocaleString();

  const topSelling = useMemo(() => {
    return [...inventoryItems]
      .sort((a, b) => (b.initialQuantity - b.quantity) - (a.initialQuantity - a.quantity))
      .slice(0, 5);
  }, [inventoryItems]);

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

  const inventoryMetricCards = [
    {
      label: 'Total Available',
      value: metrics.totalAvailableStock,
      icon: Layers,
      bgClass: 'bg-blue-200',
      description: 'Stock initially recorded'
    },
    {
      label: 'Total Sold',
      value: metrics.totalSoldQuantity,
      icon: TrendingUp,
      bgClass: 'bg-orange-200',
      description: 'Units sold across transactions'
    },
    {
      label: 'Total Remaining',
      value: metrics.totalRemainingStock,
      icon: Package,
      bgClass: 'bg-teal-200',
      description: 'Available minus sold'
    }
  ];

  const getMascotImage = (mood: string): string => {
    switch (mood) {
      case 'happy': return '/tailor_cat_happy.png';
      case 'neutral': return '/tailor_cat_neutral.png';
      case 'sad': return '/tailor_cat_sad.png';
      default: return '/tailor_cat.png';
    }
  };

  // Dynamic Tailor Cat Mascot logic
  const getMascotConfig = () => {
    if (inventoryItems.length === 0) {
      return {
        mood: 'sad',
        image: getMascotImage('sad'),
        dialogue: "আরে আপু, ক্যাশবাক্স তো বসাইছি কিন্তু দোকান তো ফাঁকা! আজকা কি বউনি হইবো না? ইনভেন্টরি ট্যাবে গিয়া জলদি কিছু মাল আমদানি করো মিয়াও! 📦",
        title: "টেইলর বিলাই (বউনি নাই)"
      };
    }

    if (metrics.safetyPocket < 0) {
      return {
        mood: 'sad',
        image: getMascotImage('sad'),
        dialogue: "হায় হায় আপু! লাভের গুড় পিঁপড়ায় খাইলো! পকেটে লাল বাতি জইলা গেছে, ফতুর দশা মিয়াও! নতুন মাল কেনা আপাতত বন্ধ রাখো! 🙀",
        title: "টেইলর বিলাই (লাল বাতি)"
      };
    }

    if (metrics.safetyPocket < safetyPocketTarget) {
      return {
        mood: 'neutral',
        image: getMascotImage('neutral'),
        dialogue: "আরে আপু, ক্যাশবাক্সের অবস্থা সুবিধার না! পকেটে লাল বাতি জইলা যাইবো মিয়াও! হাত একটু টান করো! 🐾",
        title: "টেইলর বিলাই (সাবধানী)"
      };
    }

    const lowStockItems = inventoryItems.filter(item => item.quantity <= 3);
    const hasLowStock = lowStockItems.length > 0;
    if (hasLowStock) {
      return {
        mood: 'neutral',
        image: getMascotImage('neutral'),
        dialogue: "আরে মিয়াও! দোকানে কিছু মাল তো হাওয়া হইয়া ফক্কা! বউনি করার মতও কিছু নাই। কাস্টমার চিল্লাইবার আগে নতুন লট টানো! 🐾",
        title: "টেইলর বিলাই (মাল শেষ)"
      };
    }

    if (metrics.safetyPocket >= 500000) {
      return {
        mood: 'happy',
        image: getMascotImage('happy'),
        dialogue: "পুরা ক্যালাও আপু! ক্যাশবাক্সে কড়কড়ে টাকা রেডি! নতুন কাপ্তান বা লট আমদানির টাইম আইসা গেছে, কোপায় দাও মিয়াও! 🧵",
        title: "টেইলর বিলাই (ক্যালাও)"
      };
    }

    return {
      mood: 'neutral',
      image: getMascotImage('neutral'),
      dialogue: "মিয়াও! ক্যাশবাক্সের অবস্থা সুবিধার না আপু। হাত একটু টান করো, ব্যবসা পুরা লাল বাতি হইয়া যাইবো! 🐾",
      title: "টেইলর বিলাই (সাবধানী)"
    };
  };

  const mascot = getMascotConfig();

  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bubbleExpanded) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
        setBubbleExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [bubbleExpanded]);

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  const handleBubbleTap = () => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (!bubbleExpanded) {
      setBubbleExpanded(true);
    }
    bubbleTimerRef.current = setTimeout(() => {
      setBubbleExpanded(false);
    }, 5000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Tailor Cat Mascot */}
      <section
        ref={bubbleRef}
        onClick={handleBubbleTap}
        className="bg-[#fceec7] rounded-2xl border-[3px] border-black p-3 shadow-neobrutal flex items-center gap-3 select-none cursor-pointer"
      >
        <div className="w-11 h-11 shrink-0 rounded-full border-[3px] border-black overflow-hidden bg-[#fceec7] flex items-center justify-center shadow-neobrutal-sm">
          <img 
            src={mascot.image} 
            alt={mascot.title} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider text-purple-600 block leading-tight">
            {mascot.title}
          </span>
          <motion.p
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`font-sans text-[11px] font-semibold text-black leading-snug mt-0.5 ${bubbleExpanded ? '' : 'line-clamp-2'}`}
          >
            {mascot.dialogue}
          </motion.p>
        </div>
      </section>

      {/* 3-Column Inventory Metrics */}
      <section className="grid grid-cols-3 gap-3">
        {inventoryMetricCards.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <div 
              key={idx} 
              className={`${card.bgClass} text-black rounded-2xl border-[3px] border-black p-3 shadow-neobrutal-sm flex flex-col justify-between min-h-[90px] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal select-none`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider text-black leading-tight">
                  {card.label}
                </span>
                <IconComponent className="w-3.5 h-3.5 shrink-0 text-black stroke-[2.5px]" />
              </div>
              <span className="font-display text-base font-extrabold tracking-tight block text-black mt-1">
                {formatNumber(card.value)}
              </span>
            </div>
          );
        })}
      </section>

      {/* Target Safety Pocket Warning Banner */}
      {metrics.safetyPocket < safetyPocketTarget && (
        <section className="bg-red-400 rounded-2xl border-[3px] border-black p-4 shadow-neobrutal-sm flex gap-3 text-black text-xs sm:text-sm select-none font-sans font-bold">
          <AlertCircle className="w-5 h-5 shrink-0 text-black stroke-[2.5px]" />
          <div>
            <p className="uppercase tracking-wider">Budget Alert: Safety Pocket Critical</p>
            <p className="mt-1 text-xs font-medium text-slate-900 leading-normal">
              The current Safety Pocket balance ({formatCurrency(metrics.safetyPocket)}) has fallen below your target threshold of {formatCurrency(safetyPocketTarget)}. Consider limiting personal spent.
            </p>
          </div>
        </section>
      )}

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
            Total Batches: {inventoryItems.length}{inventoryItems.length > 5 ? ' (top 5 shown)' : ''}
          </span>
        </div>

        <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden divide-y-2 divide-black shadow-neobrutal-sm">
          {inventoryItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50 text-black" />
              No inventory batches logged yet. Go to the Inventory tab to import a shipment.
            </div>
          ) : (
            topSelling.map((item) => {
              // Badge configuration based on stock count
              let badgeClass = '';
              let badgeLabel = '';
              const isOutOfStock = item.quantity === 0;

              if (isOutOfStock) {
                badgeClass = 'bg-red-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
              } else if (item.quantity <= 3) {
                badgeClass = 'bg-yellow-300 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
              } else {
                badgeClass = 'bg-green-400 text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]';
                badgeLabel = `${item.initialQuantity} / ${item.quantity} left`;
              }

              const preferredPrice = calculatePreferredPrice(item.trueCost, targetMarkup);

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
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-700">
                      <span>Wholesale: <strong className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</strong></span>
                      <span>True Cost: <strong className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</strong></span>
                      <span>Pref Sell: <strong className="text-purple-600 font-extrabold">{formatCurrency(preferredPrice)}</strong></span>
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
