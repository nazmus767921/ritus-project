interface SystemAlertProps {
  config: { title: string; message: string } | null;
  onClose: () => void;
}

export default function SystemAlert({ config, onClose }: SystemAlertProps) {
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs px-6 animate-fade-in">
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-neobrutal w-full max-w-[290px] overflow-hidden animate-scale-up">
        <div className="bg-red-400 text-black border-b-[3px] border-black px-4 py-2 flex items-center justify-between select-none">
          <span className="font-display font-extrabold text-xs uppercase">System_Alert.exe</span>
          <button
            onClick={onClose}
            className="w-6 h-6 bg-white border-2 border-black rounded flex items-center justify-center text-black font-extrabold text-[9px] cursor-pointer"
          >
            X
          </button>
        </div>
        <div className="p-4 space-y-2">
          <h4 className="font-sans font-bold text-black text-sm uppercase tracking-wide">{config.title}</h4>
          <p className="text-xs text-slate-800 font-medium leading-relaxed">{config.message}</p>
        </div>
        <div className="p-3 border-t-2 border-black flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="bg-white border-2 border-black rounded-lg py-1 px-4 text-xs font-sans font-bold uppercase tracking-wider text-black min-h-[36px] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
