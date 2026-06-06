import { useState, useEffect } from 'react';
import { Scissors, Shirt, Wallet, Package } from 'lucide-react';
import { insertTransaction, updateTransaction } from '../db/queries/transactions';
import { calculatePreferredPrice } from '../lib/math/pricing';
import { roundPrice } from '../lib/math/rounding';
import type { TransactionRecord, InventoryItemRecord } from '../db/types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction?: TransactionRecord | null;
  inventoryItems?: InventoryItemRecord[];
  targetMarkup?: number;
}

type TransactionType = 'income' | 'expense';
type TransactionCategory =
  | 'personal_expense'
  | 'tailoring_expense'
  | 'clothing_overhead'
  | 'tailoring_income'
  | 'clothing_income';

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
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<TransactionCategory>('tailoring_income');
  const [inventoryItemId, setInventoryItemId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // iOS-style Alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // When type changes, automatically reset/default the active category
  useEffect(() => {
    if (!transaction) {
      if (type === 'income') {
        setCategory('tailoring_income');
      } else {
        setCategory('personal_expense');
      }
      setInventoryItemId(null);
    }
  }, [type, transaction]);

  // Load transaction if editing
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setAmountStr((transaction.amount / 100).toFixed(2));
        setDescription(transaction.description);
        setCategory(transaction.category);
        setInventoryItemId(transaction.inventoryItemId || null);
        
        const isIncome = transaction.category === 'tailoring_income' || transaction.category === 'clothing_income';
        setType(isIncome ? 'income' : 'expense');
      } else {
        setAmountStr('');
        setDescription('');
        setType('income');
        setCategory('tailoring_income');
        setInventoryItemId(null);
      }
    }
  }, [isOpen, transaction]);

  if (!isOpen) return null;

  // Filter active inventory items (include current linked item even if stock is 0 so it displays correctly when editing)
  const activeItemsForDropdown = inventoryItems.filter(item => 
    item.quantity > 0 || (transaction && transaction.inventoryItemId === item.id)
  );

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      // Validation 1: Blank amount
      if (!amountStr.trim()) {
        throw new Error('Transaction amount must be a positive number.');
      }

      // Validation 2: Parse and check for valid positive number
      const parsedAmount = parseFloat(amountStr);
      const scaledAmount = Math.round(parsedAmount * 100);
      const roundedAmount = roundPrice(scaledAmount);

      if (isNaN(roundedAmount) || roundedAmount <= 0) {
        throw new Error('Transaction amount must be a positive number.');
      }

      // Validation 3: Blank description
      if (!description.trim()) {
        throw new Error('Transaction description cannot be blank.');
      }

      // Validation 4: Stock selection mandatory for clothing income
      if (category === 'clothing_income' && !inventoryItemId) {
        throw new Error('Please select a stock item for clothing sales.');
      }

      if (transaction) {
        // Edit mode: update transaction
        await updateTransaction(transaction.id, {
          amount: roundedAmount,
          category,
          description: description.trim(),
          createdAt: transaction.createdAt,
          status: transaction.status,
          inventoryItemId: category === 'clothing_income' ? inventoryItemId : null
        });
      } else {
        // Insert mode
        await insertTransaction({
          amount: roundedAmount,
          category,
          description: description.trim(),
          createdAt: new Date(),
          inventoryItemId: category === 'clothing_income' ? inventoryItemId : null
        });
      }

      // Clear form inputs
      setAmountStr('');
      setDescription('');
      setType('income');
      setCategory('tailoring_income');
      setInventoryItemId(null);

      // Callback to refresh data and close
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 transition-opacity duration-300">
      {/* Tap outside to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Centered Retro Dialog Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl border-[3px] border-black shadow-neobrutal overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Retro Dialog Title Bar */}
        <div className="bg-slate-200 border-b-[3px] border-black px-4 py-2.5 flex items-center justify-between select-none">
          <span className="font-display font-extrabold text-sm uppercase text-black">
            {transaction ? 'Edit_Transaction.exe' : 'New_Transaction.exe'}
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
        <div className="p-5 space-y-5 overflow-y-auto">
          
          {/* Segmented Control - Type Selector (Income vs Expense) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full border-2 border-black min-h-[46px] select-none">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 text-center py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg min-h-[36px] flex items-center justify-center transition-all ${
                type === 'income'
                  ? 'bg-purple-600 text-white border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 text-center py-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg min-h-[36px] flex items-center justify-center transition-all ${
                type === 'expense'
                  ? 'bg-purple-600 text-white border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Expense
            </button>
          </div>

          {/* Form Group: Category Selector */}
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
                      if (cat.id !== 'clothing_income') setInventoryItemId(null);
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

          {/* Stock Item Selector - Displays when Clothing Retail Sale is selected */}
          {category === 'clothing_income' && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-xs font-sans font-bold text-slate-700 uppercase">Select Stock Item</label>
              <select
                value={inventoryItemId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const itemId = val ? parseInt(val) : null;
                  setInventoryItemId(itemId);
                  
                  // Autofill preferred selling price based on target markup
                  if (itemId) {
                    const selectedItem = inventoryItems.find(item => item.id === itemId);
                    if (selectedItem) {
                      const preferredPrice = calculatePreferredPrice(selectedItem.trueCost, targetMarkup);
                      setAmountStr((preferredPrice / 100).toFixed(2));
                      setDescription(`Sale: ${selectedItem.brand} (Cost: ৳${(selectedItem.trueCost / 100).toFixed(2)})`);
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
                      {item.brand} (Batch #{item.id}) - Qty: {item.quantity} - Pref: ৳{(preferredPrice / 100).toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Form Group: Inputs */}
          <div className="space-y-4">
            {/* Amount Field */}
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

            {/* Description Field */}
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
