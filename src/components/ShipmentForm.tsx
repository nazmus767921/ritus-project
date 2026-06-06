import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Check, Layers, Tag, Crosshair } from 'lucide-react';
import { calculateOptionA } from '../lib/math/allocator';
import { formatCurrency } from '../lib/math/rounding';
import { createShipmentTransaction, updateShipment } from '../db/queries/shipments';
import type { ShipmentWithItems } from '../db/types';
import BottomSheet from './BottomSheet';
import SystemAlert from './SystemAlert';

interface ShipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  shipment?: ShipmentWithItems | null;
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
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<'base' | 'review' | 'confirm'>('base');
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (shipment) {
        setCourierFeeStr(`${Math.round(shipment.courierFee / 100)}`);
        const date = new Date(shipment.deliveryDate);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        setDeliveryDateStr(`${yyyy}-${mm}-${dd}`);
        setLines(shipment.items.map((item) => ({
          id: item.id,
          brand: item.brand,
          quantityStr: item.quantity.toString(),
          wholesaleCostStr: `${Math.round(item.wholesaleCost / 100)}`
        })));
        setExpandedIndex(0);
      } else {
        setCourierFeeStr('0.00');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDeliveryDateStr(`${yyyy}-${mm}-${dd}`);
        setLines([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
        setExpandedIndex(0);
      }
      setView('base');
    }
  }, [isOpen, shipment]);

  const liveTrueCosts = useMemo(() => {
    const feePoisha = Math.round(parseFloat(courierFeeStr) * 100);
    if (isNaN(feePoisha) || feePoisha < 0) return null;

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

  const allRowsValid = useMemo(() => {
    return lines.every(line => line.brand.trim() && parseInt(line.quantityStr) > 0 && parseFloat(line.wholesaleCostStr) > 0);
  }, [lines]);

  const totalUniqueItems = lines.filter(l => l.brand.trim()).length;
  const totalQuantity = lines.reduce((sum, l) => sum + (parseInt(l.quantityStr) || 0), 0);
  const totalWholesalePrice = useMemo(() => {
    return lines.reduce((sum, l) => {
      const qty = parseInt(l.quantityStr);
      const cost = parseFloat(l.wholesaleCostStr);
      if (isNaN(qty) || isNaN(cost)) return sum;
      return sum + qty * cost;
    }, 0);
  }, [lines]);

  const handleAddLine = () => {
    const newIndex = lines.length;
    setLines([...lines, { brand: '', quantityStr: '', wholesaleCostStr: '' }]);
    setExpandedIndex(newIndex);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
    if (expandedIndex >= newLines.length) {
      setExpandedIndex(Math.max(0, newLines.length - 1));
    } else if (expandedIndex === index) {
      setExpandedIndex(Math.min(index, newLines.length - 1));
    }
  };

  const handleLineChange = (index: number, field: keyof FormLine, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      const parsedFee = Math.round(parseFloat(courierFeeStr) * 100);
      if (isNaN(parsedFee) || parsedFee < 0) {
        throw new Error("Courier fee must be a valid non-negative number.");
      }
      if (!deliveryDateStr) {
        throw new Error("Delivery date cannot be blank.");
      }
      const deliveryDate = new Date(deliveryDateStr);
      if (isNaN(deliveryDate.getTime())) {
        throw new Error("Invalid delivery date.");
      }
      if (lines.length === 0) {
        throw new Error("Must include at least one inventory item.");
      }

      const validatedItems = lines.map((line, index) => {
        const brandClean = line.brand.trim();
        if (!brandClean) {
          throw new Error(`Row ${index + 1}: Brand name cannot be empty.`);
        }
        const qty = Math.round(parseFloat(line.quantityStr));
        if (isNaN(qty) || qty <= 0) {
          throw new Error(`Row ${index + 1}: Quantity must be a positive number.`);
        }
        const cost = Math.round(parseFloat(line.wholesaleCostStr) * 100);
        if (isNaN(cost) || cost <= 0) {
          throw new Error(`Row ${index + 1}: Wholesale cost must be positive.`);
        }
        return { id: line.id, brand: brandClean, quantity: qty, wholesaleCost: cost, trueCost: 0 };
      });

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

      if (shipment) {
        await updateShipment(shipment.id, parsedFee, deliveryDate, itemsToInsert);
      } else {
        await createShipmentTransaction(parsedFee, deliveryDate, itemsToInsert);
      }

      setCourierFeeStr('0.00');
      setLines([{ brand: '', quantityStr: '', wholesaleCostStr: '' }]);
      setView('base');
      onSave();
      onClose();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Validation Error',
        message: err instanceof Error ? err.message : 'Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCollapsedRow = (line: FormLine, index: number) => {
    const trueCost = liveTrueCosts?.[index];
    const qty = parseInt(line.quantityStr);
    const cost = parseFloat(line.wholesaleCostStr);
    const hasAnyData = (!isNaN(qty) && qty > 0) || (!isNaN(cost) && cost > 0);
    if (!hasAnyData && (trueCost === undefined || trueCost === null || trueCost === 0)) return null;

    return (
      <div className="flex items-center gap-2 py-1.5">
        {!isNaN(qty) && qty > 0 && (
          <div className="bg-blue-200 rounded-lg border-2 border-black px-2 py-1.5 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Layers className="w-3 h-3 text-black shrink-0" />
            <span className="text-black font-display text-xs font-extrabold leading-none">{qty}</span>
          </div>
        )}
        {!isNaN(cost) && cost > 0 && (
          <div className="bg-yellow-200 rounded-lg border-2 border-black px-2 py-1.5 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Tag className="w-3 h-3 text-black shrink-0" />
            <span className="text-black font-display text-xs font-extrabold leading-none">{formatCurrency(Math.round(cost * 100))}</span>
          </div>
        )}
        {trueCost !== undefined && trueCost !== null && trueCost > 0 && (
          <div className="bg-green-200 rounded-lg border-2 border-black px-2 py-1.5 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Crosshair className="w-3 h-3 text-black shrink-0" />
            <span className="text-black font-display text-xs font-extrabold leading-none">{formatCurrency(trueCost)}</span>
          </div>
        )}
      </div>
    );
  };

  const renderExpandedRow = (line: FormLine, index: number) => {
    const previewTrueCost = liveTrueCosts?.[index];
    return (
      <div className="space-y-3 pt-2 border-t-2 border-black">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Brand</label>
            <input
              type="text"
              placeholder="e.g. Zara"
              value={line.brand}
              onChange={(e) => handleLineChange(index, 'brand', e.target.value)}
              className="bg-white border-2 border-black rounded-lg py-1.5 px-2.5 text-sm text-black focus:outline-none min-h-[38px] w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Quantity</label>
            <input
              type="number"
              placeholder="0"
              value={line.quantityStr}
              onChange={(e) => handleLineChange(index, 'quantityStr', e.target.value)}
              className="bg-white border-2 border-black rounded-lg py-1.5 px-2.5 font-mono text-sm text-black focus:outline-none min-h-[38px] w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Wholesale (৳)</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={line.wholesaleCostStr}
              onChange={(e) => handleLineChange(index, 'wholesaleCostStr', e.target.value)}
              className="bg-white border-2 border-black rounded-lg py-1.5 px-2.5 font-mono text-sm text-black focus:outline-none min-h-[38px] w-full"
            />
          </div>
        </div>
        {previewTrueCost !== undefined && previewTrueCost !== null && (
          <div className="bg-slate-50 rounded-lg border-2 border-black p-2 flex justify-between items-center text-xs">
            <span className="text-slate-700 font-sans font-bold uppercase tracking-wider text-[9px]">Per-Unit True Cost</span>
            <span className="font-mono font-bold text-black">{formatCurrency(previewTrueCost)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <SystemAlert config={alertConfig} onClose={() => setAlertConfig(null)} />

      {/* Base bottom sheet */}
      <BottomSheet
        isOpen={isOpen && view === 'base'}
        onClose={onClose}
        title={shipment ? 'Edit Shipment' : 'Import Shipment'}
        leftAction={{ label: 'Cancel', onClick: onClose }}
        rightAction={{ label: 'Review', onClick: () => setView('review'), disabled: !allRowsValid }}
      >
        <div className="bg-slate-50 rounded-xl border-2 border-black p-4 space-y-3 shadow-neobrutal-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-700 uppercase">Courier Fee (৳)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={courierFeeStr}
                onChange={(e) => setCourierFeeStr(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-xl py-2 px-3 font-mono text-sm text-black focus:outline-none min-h-[40px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-sans font-bold text-slate-700 uppercase">Delivery Date</label>
              <input
                type="date"
                value={deliveryDateStr}
                onChange={(e) => setDeliveryDateStr(e.target.value)}
                className="w-full bg-white border-2 border-black rounded-xl py-2 px-3 font-mono text-sm text-black focus:outline-none min-h-[40px]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[10px] font-sans font-bold text-slate-700 uppercase tracking-wider">
            Items ({lines.length})
          </span>
          <button
            type="button"
            onClick={handleAddLine}
            className="bg-purple-600 text-white border-2 border-black rounded-xl py-1.5 px-3 text-xs font-sans font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] flex items-center gap-1 min-h-[36px] cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3px]" /> Add Row
          </button>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className={`bg-slate-50 rounded-xl border-2 border-black shadow-neobrutal-sm overflow-hidden transition-all ${
                  isExpanded ? '' : 'hover:bg-yellow-50/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                  className="w-full flex items-center gap-2 p-3 min-h-[44px] cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0 text-purple-600 stroke-[3px]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0 text-slate-500 stroke-[3px]" />
                    )}
                    <span className="text-xs font-sans font-bold text-black">
                      #{index + 1} {line.brand || <span className="text-slate-400 font-normal">New Item</span>}
                    </span>
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveLine(index); }}
                      className="text-red-500 hover:text-red-700 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </button>

                {!isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t-2 border-black">
                    {renderCollapsedRow(line, index)}
                  </div>
                )}

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    {renderExpandedRow(line, index)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* Review bottom sheet */}
      <BottomSheet
        isOpen={isOpen && view === 'review'}
        onClose={onClose}
        title="Verify Items"
        leftAction={{ label: 'Back', onClick: () => setView('base') }}
        rightAction={{ label: 'Confirm', onClick: () => setView('confirm'), disabled: !allRowsValid }}
      >
        {lines.map((line, index) => {
          const trueCost = liveTrueCosts?.[index];
          const qty = parseInt(line.quantityStr);
          const cost = parseFloat(line.wholesaleCostStr);
          return (
            <div key={index} className="bg-slate-50 rounded-xl border-2 border-black p-4 shadow-neobrutal-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-sans font-bold text-black">#{index + 1} {line.brand}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setExpandedIndex(index);
                      setView('base');
                    }}
                    className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg border border-purple-200 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    title="Edit item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {lines.length > 1 && (
                    <button
                      onClick={() => handleRemoveLine(index)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg border border-red-200 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block font-sans font-bold text-[8px] uppercase">Quantity</span>
                  <span className="text-black font-extrabold">{isNaN(qty) ? '-' : qty}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans font-bold text-[8px] uppercase">Wholesale</span>
                  <span className="text-black font-extrabold">{isNaN(cost) ? '-' : formatCurrency(Math.round(cost * 100))}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-sans font-bold text-[8px] uppercase">True Cost</span>
                  <span className="text-green-600 font-extrabold">
                    {trueCost !== undefined && trueCost !== null ? formatCurrency(trueCost) : '-'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </BottomSheet>

      {/* Final confirmation bottom sheet */}
      <BottomSheet
        isOpen={isOpen && view === 'confirm'}
        onClose={onClose}
        title="Final Approval"
        leftAction={{ label: 'Back', onClick: () => setView('review') }}
        rightAction={{ label: 'Import', onClick: handleSave, disabled: isSubmitting || !allRowsValid, primary: true }}
        maxHeight="70vh"
        zIndex={60}
      >
        <div className="bg-purple-50 rounded-2xl border-[3px] border-black p-5 space-y-4 shadow-neobrutal-sm">
          <div className="text-center space-y-1">
            <Check className="w-8 h-8 mx-auto text-purple-600 stroke-[3px]" />
            <h3 className="text-sm font-display font-extrabold uppercase tracking-wider text-black">
              Ready to Import
            </h3>
          </div>

          <div className="border-t-2 border-black pt-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b-2 border-black/30">
              <span className="text-xs font-sans font-bold text-slate-700 uppercase">Unique Items</span>
              <span className="font-display text-lg font-extrabold text-black">{totalUniqueItems}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-black/30">
              <span className="text-xs font-sans font-bold text-slate-700 uppercase">Total Quantity</span>
              <span className="font-display text-lg font-extrabold text-black">{totalQuantity}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-black/30">
              <span className="text-xs font-sans font-bold text-slate-700 uppercase">Total Wholesale Price</span>
              <span className="font-display text-lg font-extrabold text-black">{formatCurrency(Math.round(totalWholesalePrice * 100))}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-sans font-bold text-slate-700 uppercase">Courier Charge</span>
              <span className="font-display text-lg font-extrabold text-black">{formatCurrency(Math.round(parseFloat(courierFeeStr || '0') * 100))}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 text-center font-sans font-medium">
          Review the details above. Click Import to save all items to inventory.
        </p>
      </BottomSheet>
    </>
  );
}
