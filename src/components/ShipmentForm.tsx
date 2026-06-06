import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { calculateOptionA } from '../lib/math/allocator';
import { createShipmentTransaction, updateShipment } from '../db/queries/shipments';

interface ShipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  shipment?: any | null;
}

interface FormLine {
  id?: number;
  brand: string;
  quantityStr: string;
  wholesaleCostStr: string;
}

export default function ShipmentForm({ isOpen, onClose, onSave, shipment = null }: ShipmentFormProps) {
  const [courierFeeStr, setCourierFeeStr] = useState('0.00');
  const [deliveryDateStr, setDeliveryDateStr] = useState('');
  const [lines, setLines] = useState<FormLine[]>([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // iOS-style Alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // Load shipment if editing, otherwise set defaults
  useEffect(() => {
    if (isOpen) {
      if (shipment) {
        setCourierFeeStr((shipment.courierFee / 100).toFixed(2));
        
        const date = new Date(shipment.deliveryDate);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        setDeliveryDateStr(`${yyyy}-${mm}-${dd}`);
        
        setLines(shipment.items.map((item: any) => ({
          id: item.id,
          brand: item.brand,
          quantityStr: item.quantity.toString(),
          wholesaleCostStr: (item.wholesaleCost / 100).toFixed(2)
        })));
      } else {
        setCourierFeeStr('0.00');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDeliveryDateStr(`${yyyy}-${mm}-${dd}`);
        setLines([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
      }
    }
  }, [isOpen, shipment]);

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
    newLines[index] = {
      ...newLines[index],
      [field]: value
    };
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
          id: line.id,
          brand: brandClean,
          quantity: qty,
          wholesaleCost: cost,
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
      if (shipment) {
        await updateShipment(
          shipment.id,
          parsedFee,
          deliveryDate,
          itemsToInsert
        );
      } else {
        await createShipmentTransaction(
          parsedFee,
          deliveryDate,
          itemsToInsert
        );
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 transition-opacity duration-300">
      {/* Tap outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Centered Retro Dialog Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border-[3px] border-black shadow-neobrutal overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Retro Dialog Title Bar */}
        <div className="bg-slate-200 border-b-[3px] border-black px-4 py-2.5 flex items-center justify-between select-none">
          <span className="font-display font-extrabold text-sm uppercase text-black">
            {shipment ? 'Edit_Shipment.exe' : 'Import_Shipment.exe'}
          </span>
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
        <div className="p-5 space-y-6 overflow-y-auto">
          
          {/* Header Shipment Metadata Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-black space-y-4 shadow-neobrutal-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Courier Fee Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans font-bold text-slate-700 uppercase">Courier Fee (Taka)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-black font-bold font-mono">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={courierFeeStr}
                    onChange={(e) => setCourierFeeStr(e.target.value)}
                    className="w-full bg-white border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-sm text-black focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Delivery Date Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans font-bold text-slate-700 uppercase">Delivery Date</label>
                <input
                  type="date"
                  value={deliveryDateStr}
                  onChange={(e) => setDeliveryDateStr(e.target.value)}
                  className="w-full bg-white border-2 border-black rounded-xl py-2 px-3 font-mono text-sm text-black focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Array Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider">
                Shipment Items
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="bg-purple-600 text-white border-2 border-black rounded-xl py-1.5 px-3 text-xs font-sans font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1 min-h-[38px] cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3px]" /> Add Row
              </button>
            </div>

            {/* List of Item Input Card Rows */}
            <div className="space-y-4">
              {lines.map((line, index) => {
                const previewTrueCost = liveTrueCosts?.[index];
                return (
                  <div key={index} className="bg-slate-50 rounded-xl border-2 border-black p-4 shadow-neobrutal-sm space-y-4 relative animate-fade-in">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2">
                      <span className="text-xs font-sans font-bold text-black uppercase tracking-wider">Item Row #{index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="text-red-600 hover:text-red-800 p-2 -mr-2 min-w-[36px] min-h-[36px] flex items-center justify-center border-2 border-transparent hover:border-black rounded-lg active:bg-slate-200 transition-all cursor-pointer"
                          title="Remove item row"
                          aria-label={`Remove row ${index + 1}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Brand Name Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Brand</label>
                        <input
                          type="text"
                          placeholder="e.g. Zara"
                          value={line.brand}
                          onChange={(e) => handleLineChange(index, 'brand', e.target.value)}
                          className="bg-white border-2 border-black rounded-lg py-1.5 px-3 text-sm text-black focus:outline-none min-h-[40px]"
                        />
                      </div>

                      {/* Quantity Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Quantity</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={line.quantityStr}
                          onChange={(e) => handleLineChange(index, 'quantityStr', e.target.value)}
                          className="bg-white border-2 border-black rounded-lg py-1.5 px-3 font-mono text-sm text-black focus:outline-none min-h-[40px]"
                        />
                      </div>

                      {/* Wholesale Cost Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Wholesale (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.wholesaleCostStr}
                          onChange={(e) => handleLineChange(index, 'wholesaleCostStr', e.target.value)}
                          className="bg-white border-2 border-black rounded-lg py-1.5 px-3 font-mono text-sm text-black focus:outline-none min-h-[40px]"
                        />
                      </div>
                    </div>

                    {/* Live Preview Row Cost Result */}
                    <div className="bg-white rounded-lg border-2 border-black p-2.5 flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-sans font-bold uppercase tracking-wider text-[10px]">Per-Unit True Cost</span>
                      <span className="font-mono font-bold text-black">
                        {previewTrueCost !== undefined && previewTrueCost !== null ? (
                          <>৳{(previewTrueCost / 100).toFixed(2)}</>
                        ) : (
                          <span className="text-slate-500 font-normal">Waiting for inputs...</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
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
              onClick={handleSave}
              className="flex-1 bg-purple-600 hover:bg-purple-700 active:translate-x-[1px] active:translate-y-[1px] border-2 border-black rounded-xl py-2 px-4 text-xs font-sans font-bold uppercase tracking-wider text-white min-h-[44px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
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
