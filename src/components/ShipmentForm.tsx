import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateOptionA } from '../lib/math/allocator';
import { createShipmentTransaction } from '../db/queries/shipments';

interface ShipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface FormLine {
  brand: string;
  quantityStr: string;
  wholesaleCostStr: string;
}

export default function ShipmentForm({ isOpen, onClose, onSave }: ShipmentFormProps) {
  const [courierFeeStr, setCourierFeeStr] = useState('0.00');
  const [deliveryDateStr, setDeliveryDateStr] = useState('');
  const [lines, setLines] = useState<FormLine[]>([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // iOS-style Alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // Set default date to today
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDeliveryDateStr(`${yyyy}-${mm}-${dd}`);
  }, [isOpen]);

  // Real-time calculation of Option A True Cost per item row
  const liveTrueCosts = useMemo(() => {
    const feePoisha = Math.round(parseFloat(courierFeeStr) * 100);
    if (isNaN(feePoisha) || feePoisha < 0) return null;

    // Sum the unit counts across all items
    const parsedItems = lines.map(line => {
      const qty = parseInt(line.quantityStr);
      const cost = Math.round(parseFloat(line.wholesaleCostStr) * 100);
      return {
        quantity: isNaN(qty) ? 0 : qty,
        wholesaleCost: isNaN(cost) ? 0 : cost
      };
    });

    const totalUnits = parsedItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalUnits <= 0) return null;

    try {
      return calculateOptionA(feePoisha, parsedItems);
    } catch {
      return null;
    }
  }, [courierFeeStr, lines]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLines([...lines, { brand: '', quantityStr: '', wholesaleCostStr: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof FormLine, value: string) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      // 1. Validate Courier Fee
      const parsedFee = Math.round(parseFloat(courierFeeStr) * 100);
      if (isNaN(parsedFee) || parsedFee < 0) {
        throw new Error("Courier fee must be a valid non-negative number.");
      }

      // 2. Validate Delivery Date
      if (!deliveryDateStr) {
        throw new Error("Delivery date cannot be blank.");
      }
      const deliveryDate = new Date(deliveryDateStr);
      if (isNaN(deliveryDate.getTime())) {
        throw new Error("Invalid delivery date.");
      }

      // 3. Validate Inventory Line Items
      if (lines.length === 0) {
        throw new Error("Must include at least one inventory item.");
      }

      const validatedItems = lines.map((line, index) => {
        const brandClean = line.brand.trim();
        if (!brandClean) {
          throw new Error(`Row ${index + 1}: Brand name cannot be empty.`);
        }

        const qty = parseInt(line.quantityStr);
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Row ${index + 1}: Quantity must be an integer greater than 0.`);
        }

        const cost = Math.round(parseFloat(line.wholesaleCostStr) * 100);
        if (isNaN(cost) || cost <= 0) {
          throw new Error(`Row ${index + 1}: Wholesale cost must be positive.`);
        }

        return {
          brand: brandClean,
          quantity: qty,
          wholesaleCost: cost,
          // True Cost will be calculated via allocator
          trueCost: 0
        };
      });

      // 4. Run allocator to set trueCosts
      const feePoisha = Math.round(parseFloat(courierFeeStr) * 100);
      const allocatorInput = validatedItems.map(item => ({
        quantity: item.quantity,
        wholesaleCost: item.wholesaleCost
      }));
      
      const trueCosts = calculateOptionA(feePoisha, allocatorInput);
      
      const itemsToInsert = validatedItems.map((item, idx) => ({
        ...item,
        trueCost: trueCosts[idx]
      }));

      // 5. Execute DB Transaction
      await createShipmentTransaction(
        parsedFee,
        deliveryDate,
        itemsToInsert
      );

      // Reset Form State
      setCourierFeeStr('0.00');
      setLines([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
      
      onSave();
      onClose();
    } catch (err: any) {
      setAlertConfig({
        title: 'Validation Error',
        message: err.message || 'Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      {/* Tap outside to dismiss bottom sheet */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-up iOS Bottom Sheet */}
      <div className="relative w-full max-w-2xl bg-slate-50 rounded-t-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]">
        
        {/* Fixed Header / Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between min-h-[44px]">
          <button
            onClick={onClose}
            className="text-sky-600 font-normal active:opacity-60 py-2 px-3 text-base min-h-[44px] flex items-center justify-center transition-opacity"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <span className="font-semibold text-slate-900 text-base">Import Shipment</span>
          <button
            onClick={handleSave}
            className="text-sky-600 font-semibold active:opacity-60 py-2 px-3 text-base min-h-[44px] flex items-center justify-center transition-opacity"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 space-y-6 overflow-y-auto pb-10">
          
          {/* Header Shipment Metadata Section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Courier Fee Row */}
            <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between min-h-[56px] gap-2">
              <label className="text-sm font-semibold text-slate-900 sm:w-36">Courier Fee</label>
              <div className="relative flex-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-semibold font-mono">৳</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={courierFeeStr}
                  onChange={(e) => setCourierFeeStr(e.target.value)}
                  className="w-full bg-transparent border-0 pl-5 pr-2 py-1.5 font-mono text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0 min-h-[44px]"
                />
              </div>
            </div>

            {/* Delivery Date Row */}
            <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between min-h-[56px] gap-2">
              <label className="text-sm font-semibold text-slate-900 sm:w-36">Delivery Date</label>
              <input
                type="date"
                value={deliveryDateStr}
                onChange={(e) => setDeliveryDateStr(e.target.value)}
                className="flex-1 bg-transparent border-0 px-0 py-1.5 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0 min-h-[44px]"
              />
            </div>
          </div>

          {/* Dynamic Array Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Shipment Items
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-sky-600 font-semibold text-sm active:opacity-60 flex items-center gap-1 py-1.5 px-3 min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>

            {/* List of Item Input Card Rows */}
            <div className="space-y-4">
              {lines.map((line, index) => {
                const previewTrueCost = liveTrueCosts?.[index];
                return (
                  <div key={index} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-500">Item Row #{index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="text-red-600 hover:text-red-800 active:opacity-60 p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-opacity"
                          title="Remove item row"
                          aria-label={`Remove row ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Brand Name Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Brand</label>
                        <input
                          type="text"
                          placeholder="e.g. Zara"
                          value={line.brand}
                          onChange={(e) => handleLineChange(index, 'brand', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 min-h-[44px]"
                        />
                      </div>

                      {/* Quantity Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={line.quantityStr}
                          onChange={(e) => handleLineChange(index, 'quantityStr', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-mono text-sm focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 min-h-[44px]"
                        />
                      </div>

                      {/* Wholesale Cost Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Wholesale (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.wholesaleCostStr}
                          onChange={(e) => handleLineChange(index, 'wholesaleCostStr', e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 font-mono text-sm focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Live Preview Row Cost Result */}
                    <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Predicted True Cost (Per Unit)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {previewTrueCost !== undefined && previewTrueCost !== null ? (
                          <>৳{(previewTrueCost / 100).toFixed(2)}</>
                        ) : (
                          <span className="text-slate-400 font-normal">Waiting for valid inputs...</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* iOS HIG-Compliant Centered Alert Modal */}
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
