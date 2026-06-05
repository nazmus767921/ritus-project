import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { insertTransaction } from '../db/queries/transactions';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

type TransactionType = 'income' | 'expense';
type TransactionCategory =
  | 'personal_expense'
  | 'tailoring_expense'
  | 'clothing_overhead'
  | 'tailoring_income'
  | 'clothing_income';

export default function TransactionForm({ isOpen, onClose, onSave }: TransactionFormProps) {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<TransactionCategory>('tailoring_income');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // iOS-style Alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // When type changes, automatically reset/default the active category to the first option of the new type (Option A)
  useEffect(() => {
    if (type === 'income') {
      setCategory('tailoring_income');
    } else {
      setCategory('personal_expense');
    }
  }, [type]);

  if (!isOpen) return null;

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

      if (isNaN(scaledAmount) || scaledAmount <= 0) {
        throw new Error('Transaction amount must be a positive number.');
      }

      // Validation 3: Blank description
      if (!description.trim()) {
        throw new Error('Transaction description cannot be blank.');
      }

      // If valid, save to database
      await insertTransaction({
        amount: scaledAmount,
        category,
        description: description.trim(),
        createdAt: new Date(),
      });

      // Clear form inputs
      setAmountStr('');
      setDescription('');
      setType('income');
      setCategory('tailoring_income');

      // Callback to refresh data and close
      onSave();
      onClose();
    } catch (err: any) {
      // Trigger native-looking iOS Alert modal on validation error
      setAlertConfig({
        title: 'Validation Error',
        message: err.message || 'Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      {/* Tap outside to dismiss bottom sheet */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-up iOS Bottom Sheet */}
      <div className="relative w-full max-w-lg bg-slate-50 rounded-t-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]">
        {/* Fixed Header / Navigation Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between min-h-[44px]">
          <button
            onClick={onClose}
            className="text-sky-600 font-normal active:opacity-60 py-2 px-3 text-base min-h-[44px] flex items-center justify-center transition-opacity"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <span className="font-semibold text-slate-900 text-base">New Transaction</span>
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
          
          {/* Segmented Control - Type Selector (Income vs Expense) */}
          <div className="bg-slate-200 p-0.5 rounded-lg flex items-center w-full min-h-[44px]">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 text-center py-2 text-sm font-semibold rounded-md min-h-[40px] flex items-center justify-center transition-all ${
                type === 'income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 active:opacity-60'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 text-center py-2 text-sm font-semibold rounded-md min-h-[40px] flex items-center justify-center transition-all ${
                type === 'expense'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 active:opacity-60'
              }`}
            >
              Expense
            </button>
          </div>

          {/* Form Group: Inputs */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Amount Row */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between min-h-[56px] gap-2">
              <label className="text-sm font-semibold text-slate-900 sm:w-28">Amount</label>
              <div className="relative flex-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-semibold font-mono">৳</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-transparent border-0 pl-5 pr-2 py-1.5 font-mono text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0 min-h-[44px]"
                  autoFocus
                />
              </div>
            </div>

            {/* Description Row */}
            <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between min-h-[56px] gap-2">
              <label className="text-sm font-semibold text-slate-900 sm:w-28">Description</label>
              <input
                type="text"
                placeholder="e.g. Silk tailoring order"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-transparent border-0 px-0 py-1.5 text-base text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-0 min-h-[44px]"
              />
            </div>
          </div>

          {/* Category Sub-selector Title */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Select Category
            </span>
            {/* Grouped Category Options Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {categoriesConfig[type].map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border flex items-center justify-between min-h-[48px] active:opacity-80 transition-all ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500 text-sky-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 font-normal hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm">{cat.label}</span>
                    {isSelected && <Check className="w-5 h-5 text-sky-600 shrink-0" />}
                  </button>
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
