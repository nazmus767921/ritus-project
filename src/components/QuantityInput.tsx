import { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export default function QuantityInput({ value, onChange, min = 1, max, disabled = false }: QuantityInputProps) {
  const [inputStr, setInputStr] = useState(String(value));

  useEffect(() => {
    setInputStr(String(value));
  }, [value]);

  const handleDecrement = () => {
    const newVal = Math.max(min, value - 1);
    onChange(newVal);
  };

  const handleIncrement = () => {
    const newVal = max !== undefined ? Math.min(max, value + 1) : value + 1;
    onChange(newVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setInputStr('');
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    setInputStr(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= min) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(inputStr, 10);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputStr(String(min));
    } else if (max !== undefined && parsed > max) {
      onChange(max);
      setInputStr(String(max));
    } else {
      setInputStr(String(parsed));
    }
  };

  return (
    <div className="flex items-center gap-0 w-full">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="w-10 h-10 flex items-center justify-center bg-slate-100 border-2 border-black rounded-l-xl hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:bg-slate-300 transition-colors min-h-[44px]"
      >
        <Minus className="w-4 h-4 stroke-[3px]" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={inputStr}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="flex-1 h-10 border-y-2 border-x-0 border-black text-center font-mono text-sm font-extrabold bg-white focus:outline-none focus:bg-yellow-50 min-h-[44px]"
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="w-10 h-10 flex items-center justify-center bg-slate-100 border-2 border-black rounded-r-xl hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:bg-slate-300 transition-colors min-h-[44px]"
      >
        <Plus className="w-4 h-4 stroke-[3px]" />
      </button>
    </div>
  );
}
