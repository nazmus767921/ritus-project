import { Package } from 'lucide-react';

export default function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-[#fceec7] rounded-2xl border-[3px] border-black p-6 shadow-neobrutal max-w-sm text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full border-[3px] border-black overflow-hidden bg-[#fceec7] shadow-neobrutal-sm">
          <img src="/tailor_cat_sad.png" alt="Tailor Cat" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-sans font-extrabold uppercase tracking-wider text-purple-600">
            টেইলর বিলাই (বউনি নাই)
          </p>
          <p className="mt-2 text-sm font-sans font-semibold text-black leading-snug">
            দোকান তো ফাঁকা! আজকা কি বউনি হইবো না? ইনভেন্টরি ট্যাবে গিয়া জলদি কিছু মাল আমদানি করো মিয়াও!
          </p>
        </div>
        <p className="text-xs text-slate-600 font-sans font-medium">
          Your dashboard will light up once you add inventory and record transactions.
        </p>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
            <Package className="w-4 h-4" /> Go to Inventory tab
          </span>
        </div>
      </div>
    </div>
  );
}
