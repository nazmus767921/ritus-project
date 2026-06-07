import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import type { DashboardMetrics, InventoryItemRecord } from '../../db/types';

interface MascotFloatingProps {
  metrics: DashboardMetrics;
  inventoryItems: InventoryItemRecord[];
  safetyPocketTarget: number;
}

function getMascotImage(mood: string): string {
  switch (mood) {
    case 'happy': return '/tailor_cat_happy.png';
    case 'neutral': return '/tailor_cat_neutral.png';
    case 'sad': return '/tailor_cat_sad.png';
    default: return '/tailor_cat.png';
  }
}

function getMascotConfig(metrics: DashboardMetrics, inventoryItems: InventoryItemRecord[], safetyPocketTarget: number) {
  if (inventoryItems.length === 0) {
    return { mood: 'sad', image: getMascotImage('sad'), dialogue: "আরে আপু, ক্যাশবাক্স তো বসাইছি কিন্তু দোকান তো ফাঁকা! আজকা কি বউনি হইবো না? ইনভেন্টরি ট্যাবে গিয়া জলদি কিছু মাল আমদানি করো মিয়াও! 📦", title: "টেইলর বিলাই (বউনি নাই)" };
  }
  if (metrics.safetyPocket < 0) {
    return { mood: 'sad', image: getMascotImage('sad'), dialogue: "হায় হায় আপু! লাভের গুড় পিঁপড়ায় খাইলো! পকেটে লাল বাতি জইলা গেছে, ফতুর দশা মিয়াও! নতুন মাল কেনা আপাতত বন্ধ রাখো! 🙀", title: "টেইলর বিলাই (লাল বাতি)" };
  }
  if (metrics.safetyPocket < safetyPocketTarget) {
    return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "আরে আপু, ক্যাশবাক্সের অবস্থা সুবিধার না! পকেটে লাল বাতি জইলা যাইবো মিয়াও! হাত একটু টান করো! 🐾", title: "টেইলর বিলাই (সাবধানী)" };
  }
  const hasLowStock = inventoryItems.filter(item => item.quantity <= 3).length > 0;
  if (hasLowStock) {
    return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "আরে মিয়াও! দোকানে কিছু মাল তো হাওয়া হইয়া ফক্কা! বউনি করার মতও কিছু নাই। কাস্টমার চিল্লাইবার আগে নতুন লট টানো! 🐾", title: "টেইলর বিলাই (মাল শেষ)" };
  }
  if (metrics.safetyPocket >= 500000) {
    return { mood: 'happy', image: getMascotImage('happy'), dialogue: "পুরা ক্যালাও আপু! ক্যাশবাক্সে কড়কড়ে টাকা রেডি! নতুন কাপ্তান বা লট আমদানির টাইম আইসা গেছে, কোপায় দাও মিয়াও! 🧵", title: "টেইলর বিলাই (ক্যালাও)" };
  }
  return { mood: 'neutral', image: getMascotImage('neutral'), dialogue: "মিয়াও! ক্যাশবাক্সের অবস্থা সুবিধার না আপু। হাত একটু টান করো, ব্যবসা পুরা লাল বাতি হইয়া যাইবো! 🐾", title: "টেইলর বিলাই (সাবধানী)" };
}

export default function MascotFloating({ metrics, inventoryItems, safetyPocketTarget }: MascotFloatingProps) {
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const mascot = getMascotConfig(metrics, inventoryItems, safetyPocketTarget);

  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleTap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpanded(true);
    timerRef.current = setTimeout(() => setExpanded(false), 5000);
  };

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {expanded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-[#fceec7] rounded-2xl border-[3px] border-black p-3 shadow-neobrutal max-w-[260px]"
        >
          <p className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-purple-600">
            {mascot.title}
          </p>
          <p className="mt-1 text-[11px] font-sans font-semibold text-black leading-snug">
            {mascot.dialogue}
          </p>
        </motion.div>
      )}
      <button
        onClick={handleTap}
        className="w-12 h-12 rounded-full border-[3px] border-black overflow-hidden bg-[#fceec7] shadow-neobrutal-sm hover:shadow-neobrutal transition-all active:translate-x-[1px] active:translate-y-[1px] shrink-0"
      >
        <img src={mascot.image} alt={mascot.title} className="w-full h-full object-cover" />
      </button>
    </div>
  );
}
