import React from 'react';

export default function StoreSelector({ source, onChange, variant = 'home' }) {
  if (variant === 'home') {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center">
        {['all', 'blinkit', 'zepto'].map(s => (
          <button
            key={s}
            type="button"
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
              source === s 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-455 shadow-[0_0_12px_rgba(244,63,94,0.08)]' 
                : 'bg-zinc-900/10 border-zinc-900 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 hover:bg-zinc-900/30'
            }`}
            onClick={() => onChange(s)}
          >
            {s === 'all' && <i className="ti ti-layout-grid"></i>}
            {s === 'blinkit' && <span className="w-1 h-1 rounded-full bg-emerald-450"></span>}
            {s === 'zepto' && <span className="w-1 h-1 rounded-full bg-purple-555"></span>}
            <span>{s === 'all' ? 'All Stores' : s}</span>
          </button>
        ))}
      </div>
    );
  }

  // variant === 'search'
  return (
    <div className="flex bg-zinc-900/40 backdrop-blur-md border border-zinc-850 rounded-xl p-1 gap-0.5 shrink-0 self-center">
      {['all', 'blinkit', 'zepto'].map(s => (
        <button 
          key={s}
          type="button" 
          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
            source === s 
              ? 'bg-zinc-800 text-white shadow-md border border-zinc-700/40' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          onClick={() => onChange(s)}
        >
          {s === 'all' && '🚀 All'}
          {s === 'blinkit' && '🟢 Blinkit'}
          {s === 'zepto' && '🟣 Zepto'}
        </button>
      ))}
    </div>
  );
}
