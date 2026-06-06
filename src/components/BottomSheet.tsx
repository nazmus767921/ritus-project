import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface BottomSheetAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  leftAction?: BottomSheetAction | null;
  rightAction?: BottomSheetAction | null;
  children: React.ReactNode;
  maxHeight?: string;
  zIndex?: number;
}

export default function BottomSheet({ isOpen, onClose, title, leftAction, rightAction, children, maxHeight = '92vh', zIndex = 50 }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="bottom-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
            style={{ zIndex: zIndex - 10 }}
            onClick={onClose}
          />
          <motion.div
            key="bottom-sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 flex flex-col bg-white rounded-t-3xl border-t-[3px] border-black shadow-neobrutal-lg"
            style={{ zIndex, maxHeight }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b-[3px] border-black shrink-0 bg-white rounded-t-3xl">
              <div className="w-20">
                {leftAction && (
                  <button
                    onClick={leftAction.onClick}
                    className="flex items-center gap-1 text-sm font-sans font-bold text-purple-600 min-h-[36px] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs">{leftAction.label}</span>
                  </button>
                )}
              </div>
              <h2 className="text-sm font-display font-extrabold uppercase tracking-wider text-black text-center flex-1 truncate px-2">
                {title}
              </h2>
              <div className="w-20 flex justify-end">
                {rightAction && (
                  <button
                    onClick={rightAction.onClick}
                    disabled={rightAction.disabled}
                    className={`text-xs font-sans font-bold uppercase tracking-wider min-h-[36px] px-4 rounded-xl border-2 border-black transition-all cursor-pointer ${
                      rightAction.primary
                        ? 'bg-purple-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed'
                        : 'bg-white text-black hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {rightAction.label}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
