import { useState, useEffect } from 'react';
import { executeProductSale } from '../db/queries/inventory';
import { calculatePreferredPrice } from '../lib/math/pricing';
import { roundPrice, formatCurrency } from '../lib/math/rounding';
import BottomSheet from './BottomSheet';
import SystemAlert from './SystemAlert';
import QuantityInput from './QuantityInput';

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
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const preferredPrice = item ? calculatePreferredPrice(item.trueCost, targetMarkup) : 0;

  useEffect(() => {
    if (isOpen && item) {
      setRetailPriceStr(`${Math.round(preferredPrice / 100)}`);
      setQuantity(1);
    } else {
      setRetailPriceStr('');
    }
  }, [isOpen, item, preferredPrice]);

  const handleSell = async () => {
    try {
      setIsSubmitting(true);

      if (!retailPriceStr.trim()) {
        throw new Error('Retail sale price must be a positive number.');
      }

      const parsedPrice = parseFloat(retailPriceStr);
      const roundedAmount = roundPrice(Math.round(parsedPrice * 100));

      if (isNaN(roundedAmount) || roundedAmount <= 0) {
        throw new Error('Retail sale price must be a positive number.');
      }

      // L2: Minimum price validation
      if (roundedAmount < 100) {
        throw new Error('Sale price must be at least 1 Taka (100 Poisha).');
      }

      if (!item) {
        throw new Error('No item selected.');
      }

      if (item.quantity < quantity) {
        throw new Error(`Insufficient stock: ${item.quantity} available, ${quantity} requested.`);
      }

      await executeProductSale(item.id, roundedAmount * quantity, note, customerName, quantity);

      setRetailPriceStr('');
      setNote('');
      setCustomerName('');
      setQuantity(1);
      onSave();
      onClose();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Transaction Error',
        message: err instanceof Error ? err.message : 'Failed to complete sale.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <>
      <SystemAlert config={alertConfig} onClose={() => setAlertConfig(null)} />

      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Execute Sale"
        leftAction={{ label: 'Cancel', onClick: onClose }}
        rightAction={{ label: 'Sell', onClick: handleSell, disabled: isSubmitting, primary: true }}
      >
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
              <span className="text-black font-extrabold">{formatCurrency(item.wholesaleCost)}</span>
            </div>
            <div>
              <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">True Cost</span>
              <span className="text-green-600 font-extrabold">{formatCurrency(item.trueCost)}</span>
            </div>
            <div>
              <span className="text-slate-600 block font-sans font-bold text-[8px] uppercase tracking-wider">Pref Sell ({Math.round(targetMarkup * 100)}% Markup)</span>
              <span className="text-purple-600 font-extrabold">{formatCurrency(preferredPrice)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-sans font-bold text-slate-700 uppercase">Quantity</label>
          <QuantityInput value={quantity} onChange={setQuantity} min={1} max={item?.quantity} />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-sans font-bold text-slate-700 uppercase">Customer Name (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Mr. Rahman"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-sm text-black focus:outline-none focus:bg-white min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-sans font-bold text-slate-700 uppercase">Note (Optional)</label>
          <input
            type="text"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-sm text-black focus:outline-none focus:bg-white min-h-[44px]"
          />
        </div>
      </BottomSheet>
    </>
  );
}
