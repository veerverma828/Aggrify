import React from 'react';

export default function StoreSelector({ source, onChange, variant = 'home' }) {
  if (variant === 'home') {
    return (
      <div className="flex flex-wrap gap-1.5 justify-center">
        {['all', 'blinkit', 'zepto', 'instamart'].map(s => (
          <button
            key={s}
            type="button"
            className={`flex items-center space-x-1.5 px-3 py-1 border-none cursor-pointer text-[9px] font-mono font-bold uppercase tracking-wider transition-colors outline-none rounded-[2px] ${
              source === s 
                ? 'bg-accent text-white' 
                : 'bg-ink-faint text-ink hover:opacity-80'
            }`}
            onClick={() => onChange(s)}
          >
            {s === 'all' && <i className="ti ti-layout-grid"></i>}
            {s === 'blinkit' && <span className="w-1 h-1 rounded-full bg-emerald-450"></span>}
            {s === 'zepto' && <span className="w-1 h-1 rounded-full bg-purple-555"></span>}
            {s === 'instamart' && <span className="w-1 h-1 rounded-full bg-orange-500"></span>}
            <span>{s === 'all' ? 'All Stores' : s === 'instamart' ? 'Instamart' : s}</span>
          </button>
        ))}
      </div>
    );
  }

  // variant === 'search'
  return (
    <div className="flex bg-ink-faint p-0.5 rounded-[4px] gap-0.5 shrink-0 self-center max-w-full font-mono">
      {['all', 'blinkit', 'zepto', 'instamart'].map(s => (
        <button 
          key={s}
          type="button" 
          className={`px-3 py-1 rounded-[2px] text-[10px] font-bold uppercase cursor-pointer outline-none border-none tracking-wider transition-colors flex items-center gap-1.5 shrink-0 ${
            source === s 
              ? 'bg-accent text-white' 
              : 'bg-transparent text-ink hover:bg-ink-faint/50'
          }`}
          onClick={() => onChange(s)}
        >
          {s === 'all' && '🚀 All'}
          {s === 'blinkit' && '🟢 Blinkit'}
          {s === 'zepto' && '🟣 Zepto'}
          {s === 'instamart' && '🟠 Instamart'}
        </button>
      ))}
    </div>
  );
}
