import { useState, useEffect } from 'react';
import { executeProductSale } from '../db/queries/inventory';

interface SellSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  item: {
    id: number;
    brand: string;
    wholesaleCost: number;
    trueCost: number;
    quantity: number;
  } | null;
}

export default function SellSheet({ isOpen, onClose, onSave, item }: SellSheetProps) {
  const [retailPriceStr, setRetailPriceStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // Prefill price suggestions or clear inputs on mount/item change
  useEffect(() => {
    if (isOpen) {
      setRetailPriceStr('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSell = async () => {
    try {
      setIsSubmitting(true);

      // Boundary Validation 1: Blank price
      if (!retailPriceStr.trim()) {
        throw new Error('Retail sale price must be a positive number.');
      }

      const parsedPrice = parseFloat(retailPriceStr);
      const scaledPrice = Math.round(parsedPrice * 100);

      // Boundary Validation 2: Negative or zero pricing
      if (isNaN(scaledPrice) || scaledPrice <= 0) {
        throw new Error('Retail sale price must be a positive number.');
      }

      // Check stock boundary before execution
      if (item.quantity <= 0) {
        throw new Error('This item is out of stock.');
      }

      // Execute database transaction (decrements quantity and logs transaction)
      await executeProductSale(item.id, scaledPrice);

      // Reset state and trigger callbacks
      setRetailPriceStr('');
      onSave();
      onClose();
    } catch (err: any) {
      // iOS Centered Alert Modal on errors
      setAlertConfig({
        title: 'Transaction Error',
        message: err.message || 'Failed to complete sale.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      {/* Tap outside backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-up iOS Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-slate-50 rounded-t-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between min-h-[44px]">
          <button
            onClick={onClose}
            className="text-sky-600 font-normal active:opacity-60 py-2 px-3 text-base min-h-[44px] flex items-center justify-center transition-opacity"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <span className="font-semibold text-slate-900 text-base">Execute Sale</span>
          <button
            onClick={handleSell}
            className="text-sky-600 font-semibold active:opacity-60 py-2 px-3 text-base min-h-[44px] flex items-center justify-center transition-opacity"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Selling...' : 'Sell'}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-6 overflow-y-auto pb-10">
          {/* Item details card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Batch #{item.id}</span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight mt-0.5">{item.brand}</h3>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                item.quantity <= 3 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {item.quantity} in Stock
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block font-sans font-semibold text-[10px] uppercase">Wholesale Cost</span>
                <span className="text-slate-700 font-bold">৳{(item.wholesaleCost / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans font-semibold text-[10px] uppercase">True Unit Cost</span>
                <span className="text-emerald-700 font-bold">৳{(item.trueCost / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Price input card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between min-h-[56px] gap-2">
              <label className="text-sm font-semibold text-slate-900 sm:w-36">Retail Sale Price</label>
              <div className="relative flex-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-semibold font-mono">৳</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={retailPriceStr}
                  onChange={(e) => setRetailPriceStr(e.target.value)}
                  className="w-full bg-transparent border-0 pl-5 pr-2 py-1.5 font-mono text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0 min-h-[44px]"
                  autoFocus
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* iOS HIG Centered Alert Dialog */}
      {alertConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-xs animate-fade-in px-6">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl w-full max-w-[270px] overflow-hidden text-center border border-slate-200 animate-scale-up">
            <div className="p-4 space-y-1">
              <h4 className="font-bold text-slate-900 text-lg leading-tight">{alertConfig.title}</h4>
              <p className="text-xs text-slate-600 font-normal leading-relaxed">{alertConfig.message}</p>
            </div>
            <div className="border-t border-slate-200 flex">
              <button
                type="button"
                onClick={() => setAlertConfig(null)}
                className="w-full py-3 text-sky-600 font-bold active:bg-slate-100 transition-colors text-base min-h-[44px] flex items-center justify-center"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
