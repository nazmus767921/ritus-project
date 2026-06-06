import { useState, useCallback } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

const PIN_STORAGE_KEY = 'clothex_pin_hash';

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36);
}

export function getStoredPinHash(): string | null {
  return localStorage.getItem(PIN_STORAGE_KEY);
}

export function setStoredPin(pin: string): void {
  if (!pin) {
    localStorage.removeItem(PIN_STORAGE_KEY);
  } else {
    localStorage.setItem(PIN_STORAGE_KEY, simpleHash(pin));
  }
}

export function hasPinEnabled(): boolean {
  return !!getStoredPinHash();
}

export function verifyPin(input: string): boolean {
  const stored = getStoredPinHash();
  if (!stored) return true;
  return simpleHash(input) === stored;
}

interface PinScreenProps {
  onUnlock: () => void;
}

export default function PinScreen({ onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleDigit = useCallback((digit: string) => {
    setPin(prev => {
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
    setError('');
  }, []);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (verifyPin(pin)) {
      onUnlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  }, [pin, onUnlock]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-yellow-100 p-4">
      <div className="w-full max-w-xs bg-white rounded-2xl border-[3px] border-black shadow-neobrutal overflow-hidden">
        <div className="bg-black text-white px-4 py-3 flex items-center justify-center gap-2 border-b-[3px] border-black">
          <Lock className="w-4 h-4" />
          <span className="font-display font-bold text-xs uppercase tracking-wider">ClothEx Locked</span>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider">Enter PIN</p>
            <div className="flex justify-center gap-2 py-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 border-black ${pin.length > i ? 'bg-purple-600' : 'bg-white'}`}
                />
              ))}
            </div>
            {error && (
              <div className="flex items-center justify-center gap-1.5 text-red-600 text-xs font-sans font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((digit, idx) => (
              digit === '' ? (
                <div key={idx} />
              ) : digit === 'del' ? (
                <button
                  key={idx}
                  onClick={handleDelete}
                  className="h-14 bg-slate-100 border-2 border-black rounded-xl text-sm font-sans font-extrabold uppercase active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
                >
                  DEL
                </button>
              ) : (
                <button
                  key={idx}
                  onClick={() => handleDigit(String(digit))}
                  className="h-14 bg-white border-2 border-black rounded-xl text-xl font-display font-bold active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
                >
                  {digit}
                </button>
              )
            ))}
          </div>

          {pin.length === 6 && (
            <button
              onClick={handleSubmit}
              className="w-full bg-purple-600 text-white border-2 border-black rounded-xl py-3 text-sm font-sans font-bold uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
            >
              Unlock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
