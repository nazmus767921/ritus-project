import { useState, useEffect } from 'react';
import { executeProductSale } from '../db/queries/inventory';
import { calculatePreferredPrice } from '../lib/math/pricing';

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
  targetMarkup: number;
}

export default function SellSheet({ isOpen, onClose, onSave, item, targetMarkup }: SellSheetProps) {
  const [retailPriceStr, setRetailPriceStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const preferredPrice = item ? calculatePreferredPrice(item.trueCost, targetMarkup) : 0;

  // Prefill price suggestions or clear inputs on mount/item change
  useEffect(() => {
    if (isOpen && item) {
      setRetailPriceStr((preferredPrice / 100).toFixed(2));
    } else {
      setRetailPriceStr('');
    }
  }, [isOpen, item, preferredPrice]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 transition-opacity duration-300">
      {/* Tap outside backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Centered Retro Dialog Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border-[3px] border-black shadow-neobrutal overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Retro Dialog Title Bar */}
        <div className="bg-slate-200 border-b-[3px] border-black px-4 py-2.5 flex items-center justify-between select-none">
          <span className="font-display font-extrabold text-sm uppercase text-black">Execute_Sale.exe</span>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-red-400 border-2 border-black rounded flex items-center justify-center text-black font-extrabold text-xs active:translate-x-[1px] active:translate-y-[1px] active:shadow-none hover:bg-red-500 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] transition-all"
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            X
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Item details card */}
          <div className="bg-slate-50 rounded-xl border-2 border-black p-4 space-y-3 shadow-neobrutal-sm">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wider">Product Batch #{item.id}</span>
                <h3 className="text-base sm:text-lg font-sans font-bold text-black leading-tight mt-0.5">{item.brand}</h3>
              </div>
              <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-md border-2 border-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 ${
                item.quantity <= 3 
                  ? 'bg-yellow-300 text-black' 
                  : 'bg-green-400 text-black'
              }`}>
                {item.quantity} In Stock
              </span>
            </div>

            <div className="border-t-2 border-black pt-3 grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">Wholesale</span>
                <span className="text-black font-extrabold">৳{(item.wholesaleCost / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">True Cost</span>
                <span className="text-green-600 font-extrabold">৳{(item.trueCost / 100).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">Pref Sell ({Math.round(targetMarkup * 100)}% Markup)</span>
                <span className="text-purple-600 font-extrabold">৳{(preferredPrice / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Price input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Retail Sale Price (Taka)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-black font-bold font-mono">৳</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={retailPriceStr}
                onChange={(e) => setRetailPriceStr(e.target.value)}
                className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-sm text-black focus:outline-none focus:bg-white min-h-[44px]"
                autoFocus
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex gap-3 pt-4 border-t-2 border-black">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 active:translate-x-[1px] active:translate-y-[1px] border-2 border-black rounded-xl py-2 px-4 text-xs font-sans font-bold uppercase tracking-wider text-black min-h-[44px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSell}
              className="flex-1 bg-purple-600 hover:bg-purple-700 active:translate-x-[1px] active:translate-y-[1px] border-2 border-black rounded-xl py-2 px-4 text-xs font-sans font-bold uppercase tracking-wider text-white min-h-[44px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Selling...' : 'Sell'}
            </button>
          </div>
        </div>
      </div>

      {/* Retro System Alert Modal */}
      {alertConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs px-6 animate-fade-in">
          <div className="bg-white rounded-2xl border-[3px] border-black shadow-neobrutal w-full max-w-[290px] overflow-hidden animate-scale-up">
            <div className="bg-red-400 text-black border-b-[3px] border-black px-4 py-2 flex items-center justify-between select-none">
              <span className="font-display font-extrabold text-xs uppercase">System_Alert.exe</span>
              <button 
                onClick={() => setAlertConfig(null)}
                className="w-6 h-6 bg-white border-2 border-black rounded flex items-center justify-center text-black font-extrabold text-[9px] cursor-pointer"
              >
                X
              </button>
            </div>
            <div className="p-4 space-y-2">
              <h4 className="font-sans font-bold text-black text-sm uppercase tracking-wide">{alertConfig.title}</h4>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">{alertConfig.message}</p>
            </div>
            <div className="p-3 border-t-2 border-black flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setAlertConfig(null)}
                className="bg-white border-2 border-black rounded-lg py-1 px-4 text-xs font-sans font-bold uppercase tracking-wider text-black min-h-[36px] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
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
