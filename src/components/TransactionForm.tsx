import { useState, useEffect, useMemo } from 'react';
import { Scissors, Shirt, Wallet, Package, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { insertTransaction, updateTransaction } from '../db/queries/transactions';
import { calculatePreferredPrice } from '../lib/math/pricing';
import { roundPrice, formatCurrency } from '../lib/math/rounding';
import type { TransactionRecord, InventoryItemRecord, TransactionCategory } from '../db/types';
import BottomSheet from './BottomSheet';
import SystemAlert from './SystemAlert';
import QuantityInput from './QuantityInput';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction?: TransactionRecord | null;
  inventoryItems?: InventoryItemRecord[];
  targetMarkup?: number;
}

type TransactionType = 'income' | 'expense';

export default function TransactionForm({
  isOpen,
  onClose,
  onSave,
  transaction = null,
  inventoryItems = [],
  targetMarkup = 0.20
}: TransactionFormProps) {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<TransactionCategory>('tailoring_income');
  const [inventoryItemId, setInventoryItemId] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Unique brands from inventory for the brand dropdown
  const uniqueBrands = useMemo(() => {
    const brands = new Set(inventoryItems.filter(i => i.quantity > 0).map(i => i.brand));
    return Array.from(brands).sort();
  }, [inventoryItems]);

  // FIFO-resolved batch info for the selected brand
  const fifoInfo = useMemo(() => {
    if (!selectedBrand) return null;
    const batches = inventoryItems
      .filter(i => i.brand === selectedBrand && i.quantity > 0)
      .sort((a, b) => a.id - b.id);
    if (batches.length === 0) return null;
    const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
    return {
      oldestBatch: batches[0],
      totalBatches: batches.length,
      totalAvailable
    };
  }, [selectedBrand, inventoryItems]);

  useEffect(() => {
    if (!transaction) {
      if (type === 'income') {
        setCategory('tailoring_income');
      } else {
        setCategory('personal_expense');
      }
      setInventoryItemId(null);
      setSelectedBrand('');
    }
  }, [type, transaction]);

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        const editUnitPrice = Math.round(transaction.amount / (transaction.quantity ?? 1) / 100);
        setAmountStr(`${editUnitPrice}`);
        setDescription(transaction.description);
        setCustomerName(transaction.customerName || '');
        setNotes(transaction.notes || '');
        setCategory(transaction.category);
        setInventoryItemId(transaction.inventoryItemId || null);
        setQuantity(transaction.quantity ?? 1);
        if (transaction.inventoryItemId) {
          const item = inventoryItems.find(i => i.id === transaction.inventoryItemId);
          setSelectedBrand(item?.brand || '');
        }

        const isIncome = transaction.category === 'tailoring_income' || transaction.category === 'clothing_income';
        setType(isIncome ? 'income' : 'expense');
      } else {
        setAmountStr('');
        setDescription('');
        setCustomerName('');
        setNotes('');
        setQuantity(1);
        setType('income');
        setCategory('tailoring_income');
        setInventoryItemId(null);
        setSelectedBrand('');
      }
    }
  }, [isOpen, transaction, inventoryItems]);

  const activeItemsForDropdown = inventoryItems.filter(item =>
    item.quantity > 0 || (transaction && transaction.inventoryItemId === item.id)
  );

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      if (!amountStr.trim()) {
        throw new Error('Transaction amount must be a positive number.');
      }

      const parsedAmount = parseFloat(amountStr);
      const scaledAmount = Math.round(parsedAmount * 100);

      if (isNaN(scaledAmount) || scaledAmount <= 0) {
        throw new Error('Transaction amount must be a positive number.');
      }

      if (scaledAmount < 100) {
        throw new Error('Transaction amount must be at least 1 Taka (100 Poisha).');
      }

      const roundedAmount = roundPrice(scaledAmount);

      if (!description.trim()) {
        throw new Error('Transaction description cannot be blank.');
      }

      if (category === 'clothing_income' && !inventoryItemId && !selectedBrand) {
        throw new Error('Please select a brand or stock item for clothing sales.');
      }

      const totalAmount = category === 'clothing_income' ? roundedAmount * quantity : roundedAmount;

      if (transaction) {
        await updateTransaction(transaction.id, {
          amount: totalAmount,
          category,
          description: description.trim(),
          customerName: customerName.trim() || null,
          notes: notes.trim() || null,
          createdAt: transaction.createdAt,
          status: transaction.status,
          inventoryItemId: category === 'clothing_income' ? inventoryItemId : null,
          quantity: category === 'clothing_income' ? quantity : 1
        });
      } else {
        await insertTransaction({
          amount: totalAmount,
          category,
          description: description.trim(),
          customerName: customerName.trim() || null,
          notes: notes.trim() || null,
          createdAt: new Date(),
          inventoryItemId: category === 'clothing_income' && showAdvanced ? inventoryItemId : null,
          brand: category === 'clothing_income' && !showAdvanced ? selectedBrand : undefined,
          quantity: category === 'clothing_income' ? quantity : 1
        });
      }

      setAmountStr('');
      setDescription('');
      setCustomerName('');
      setNotes('');
      setQuantity(1);
      setType('income');
      setCategory('tailoring_income');
      setInventoryItemId(null);
      setSelectedBrand('');

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

  const categoryIcons: Record<TransactionCategory, typeof Scissors> = {
    tailoring_income: Scissors,
    clothing_income: Shirt,
    personal_expense: Wallet,
    tailoring_expense: Scissors,
    clothing_overhead: Package,
    cost_of_goods_sold: Package,
    supplier_return: Package,
  };

  const categoriesConfig = {
    income: [
      { id: 'tailoring_income' as const, label: 'Tailoring Service' },
      { id: 'clothing_income' as const, label: 'Clothing Retail Sale' },
    ],
    expense: [
      { id: 'personal_expense' as const, label: 'Personal Spent' },
      { id: 'tailoring_expense' as const, label: 'Tailoring Expense' },
      { id: 'clothing_overhead' as const, label: 'Clothing Overhead' },
    ],
  };

  return (
    <>
      <SystemAlert config={alertConfig} onClose={() => setAlertConfig(null)} />

      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={transaction ? 'Edit Transaction' : 'New Transaction'}
        leftAction={{ label: 'Cancel', onClick: onClose }}
        rightAction={{ label: 'Save', onClick: handleSave, disabled: isSubmitting, primary: true }}
      >
        <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full border-2 border-black min-h-[46px] select-none">
          <button
            type="button"
            onClick={() => !transaction && setType('income')}
            className={`flex-1 text-center py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg min-h-[36px] flex items-center justify-center transition-all ${
              type === 'income'
                ? 'bg-purple-600 text-white border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                : 'text-slate-700 hover:bg-slate-200'
            } ${transaction ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => !transaction && setType('expense')}
            className={`flex-1 text-center py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg min-h-[36px] flex items-center justify-center transition-all ${
              type === 'expense'
                ? 'bg-purple-600 text-white border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                : 'text-slate-700 hover:bg-slate-200'
            } ${transaction ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Expense
          </button>
        </div>

        {transaction && (
          <div className="bg-yellow-200 border-2 border-black rounded-xl p-3 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-black stroke-[2.5px]" />
            <p className="text-[10px] font-sans font-bold text-black leading-relaxed">
              To change transaction type, delete and recreate this transaction.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider">
            Select Category
          </span>
          <div className="grid grid-cols-2 gap-3">
            {categoriesConfig[type].map((cat) => {
              const isSelected = category === cat.id;
              const IconComponent = categoryIcons[cat.id];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    if (cat.id !== 'clothing_income') {
                      setInventoryItemId(null);
                      setSelectedBrand('');
                    }
                  }}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer min-h-[100px] ${
                    isSelected
                      ? 'bg-purple-100 border-black text-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white border-black text-slate-800 hover:bg-slate-50 active:translate-x-[1px] active:translate-y-[1px]'
                  }`}
                >
                  <IconComponent className={`w-10 h-10 ${isSelected ? 'text-purple-700' : 'text-slate-600'}`} />
                  <span className="text-[10px] font-sans font-bold text-center leading-tight px-1">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {category === 'clothing_income' && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Select Brand (FIFO)</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                const brand = e.target.value;
                setSelectedBrand(brand);
                setInventoryItemId(null);
                if (brand) {
                  const matching = inventoryItems.filter(i => i.brand === brand && i.quantity > 0);
                  const oldest = matching.sort((a, b) => a.id - b.id)[0];
                  if (oldest) {
                    const preferredPrice = calculatePreferredPrice(oldest.trueCost, targetMarkup);
                    setAmountStr(`${Math.round(preferredPrice / 100)}`);
                    if (!transaction) {
                      setDescription(`Sale: ${brand}`);
                    }
                  }
                }
              }}
              className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-sans text-sm text-black focus:outline-none min-h-[44px]"
            >
              <option value="">-- Choose Brand --</option>
              {uniqueBrands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            {fifoInfo && (
              <div className="bg-blue-50 border-2 border-black rounded-lg p-2 text-[10px] font-sans font-bold text-black">
                FIFO: {fifoInfo.oldestBatch.brand} — Batch #{fifoInfo.oldestBatch.id} (oldest, {fifoInfo.oldestBatch.quantity} units available, {fifoInfo.totalBatches} batch{fifoInfo.totalBatches > 1 ? 'es' : ''})
              </div>
            )}
          </div>
        )}

        {/* Advanced: pick specific batch instead of brand */}
        {category === 'clothing_income' && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center gap-2 text-xs font-sans font-bold text-slate-600 uppercase tracking-wider py-2 min-h-[36px] cursor-pointer"
          >
            {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Pick Specific Batch (Advanced)
          </button>
        )}

        {category === 'clothing_income' && showAdvanced && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Select Stock Item</label>
            <select
              value={inventoryItemId || ''}
              onChange={(e) => {
                const val = e.target.value;
                const itemId = val ? parseInt(val) : null;
                setInventoryItemId(itemId);
                setSelectedBrand('');

                if (itemId) {
                  const selectedItem = inventoryItems.find(item => item.id === itemId);
                  if (selectedItem) {
                    const preferredPrice = calculatePreferredPrice(selectedItem.trueCost, targetMarkup);
                    setAmountStr(`${Math.round(preferredPrice / 100)}`);
                    if (!transaction) {
                      setDescription(`Sale: ${selectedItem.brand} (Cost: ${formatCurrency(selectedItem.trueCost)})`);
                    }
                  }
                }
              }}
              className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-sans text-sm text-black focus:outline-none min-h-[44px]"
            >
              <option value="">-- Choose Stock Item --</option>
              {activeItemsForDropdown.map(item => {
                const preferredPrice = calculatePreferredPrice(item.trueCost, targetMarkup);
                return (
                  <option key={item.id} value={item.id}>
                    {item.brand} (Batch #{item.id}) - Qty: {item.quantity} - Pref: {formatCurrency(preferredPrice)}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {category === 'clothing_income' && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Quantity</label>
            <QuantityInput value={quantity} onChange={setQuantity} min={1} max={inventoryItemId ? Math.max(inventoryItems.find(i => i.id === inventoryItemId)?.quantity ?? 1, transaction ? (transaction.quantity ?? 1) : 0) : (fifoInfo?.totalAvailable || undefined)} />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Amount (Taka)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-black font-bold font-mono">৳</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-sm text-black focus:outline-none focus:bg-white focus:ring-0 min-h-[44px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Description</label>
            <input
              type="text"
              placeholder="e.g. Silk tailoring order"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-sans text-sm text-black focus:outline-none focus:bg-white focus:ring-0 min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Customer Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Mr. Rahman"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-sans text-sm text-black focus:outline-none focus:bg-white focus:ring-0 min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans font-bold text-slate-700 uppercase">Notes (Optional)</label>
            <input
              type="text"
              placeholder="Add a note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-sans text-sm text-black focus:outline-none focus:bg-white focus:ring-0 min-h-[44px]"
            />
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
