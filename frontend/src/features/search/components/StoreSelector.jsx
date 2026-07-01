import React from 'react';

export default function StoreSelector({ source, onChange, variant = 'home' }) {
  const stores = ['all', 'blinkit', 'zepto', 'instamart'];

  if (variant === 'home') {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {stores.map(s => (
          <button
            key={s}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 border border-transparent rounded-full font-medium text-sm transition-all duration-300 outline-none ${
              source === s 
                ? 'bg-white text-black shadow-lg scale-105' 
                : 'bg-white/5 text-ink-muted hover:text-white hover:bg-white/10'
            }`}
            onClick={() => onChange(s)}
          >
            {s === 'blinkit' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-emerald-500' : 'bg-emerald-500/50'}`}></span>}
            {s === 'zepto' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-purple-500' : 'bg-purple-500/50'}`}></span>}
            {s === 'instamart' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-orange-500' : 'bg-orange-500/50'}`}></span>}
            <span className="capitalize">{s === 'all' ? 'All Stores' : s}</span>
          </button>
        ))}
      </div>
    );
  }

  // variant === 'search'
  return (
    <div className="flex bg-white/5 p-1 rounded-full gap-1 shrink-0 self-center max-w-full overflow-x-auto hide-scrollbar border border-white/10">
      {stores.map(s => (
        <button 
          key={s}
          type="button" 
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 shrink-0 ${
            source === s 
              ? 'bg-white text-black shadow-sm' 
              : 'bg-transparent text-ink-muted hover:text-white hover:bg-white/5'
          }`}
          onClick={() => onChange(s)}
        >
          {s === 'blinkit' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-emerald-500' : 'bg-emerald-500/50'}`}></span>}
          {s === 'zepto' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-purple-500' : 'bg-purple-500/50'}`}></span>}
          {s === 'instamart' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-orange-500' : 'bg-orange-500/50'}`}></span>}
          <span className="capitalize">{s === 'all' ? 'All Stores' : s}</span>
        </button>
      ))}
    </div>
  );
}
