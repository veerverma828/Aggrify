import React from 'react';

export default function StoreSelector({ source, onChange, variant = 'home', supportedStores = null, locationName = '' }) {
  const stores = ['all', 'blinkit', 'zepto', 'instamart'];

  // If supportedStores is provided, a store is unsupported if it's not in the array (excluding 'all')
  const isUnsupported = (s) => s !== 'all' && supportedStores !== null && !supportedStores.includes(s);

  if (variant === 'home') {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {stores.map(s => {
          const unavailable = isUnsupported(s);
          return (
            <button
              key={s}
              type="button"
              title={unavailable ? `${s.charAt(0).toUpperCase() + s.slice(1)} is not available in ${locationName}` : undefined}
              disabled={unavailable}
              className={`flex items-center gap-2 px-4 py-2 border border-transparent rounded-full font-medium text-sm transition-all duration-300 outline-none ${
                unavailable
                  ? 'opacity-30 cursor-not-allowed bg-white/5 text-ink-muted'
                  : source === s
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-white/5 text-ink-muted hover:text-white hover:bg-white/10'
              }`}
              onClick={() => !unavailable && onChange(s)}
            >
              {s === 'blinkit' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-emerald-500' : 'bg-emerald-500/50'}`}></span>}
              {s === 'zepto' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-purple-500' : 'bg-purple-500/50'}`}></span>}
              {s === 'instamart' && <span className={`w-2 h-2 rounded-full ${source === s ? 'bg-orange-500' : 'bg-orange-500/50'}`}></span>}
              <span className="capitalize">{s === 'all' ? 'All Stores' : s}</span>
              {unavailable && <span className="text-[10px] ml-0.5 opacity-70">✕</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // variant === 'search'
  return (
    <div className="flex bg-white/5 p-1 rounded-full gap-1 shrink-0 self-center max-w-full overflow-x-auto hide-scrollbar border border-white/10">
      {stores.map(s => {
        const unavailable = isUnsupported(s);
        return (
          <button
            key={s}
            type="button"
            title={unavailable ? `${s.charAt(0).toUpperCase() + s.slice(1)} is not available in ${locationName}` : undefined}
            disabled={unavailable}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 shrink-0 ${
              unavailable
                ? 'opacity-30 cursor-not-allowed text-ink-muted'
                : source === s
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-transparent text-ink-muted hover:text-white hover:bg-white/5'
            }`}
            onClick={() => !unavailable && onChange(s)}
          >
            {s === 'blinkit' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-emerald-500' : 'bg-emerald-500/50'}`}></span>}
            {s === 'zepto' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-purple-500' : 'bg-purple-500/50'}`}></span>}
            {s === 'instamart' && <span className={`w-1.5 h-1.5 rounded-full ${source === s ? 'bg-orange-500' : 'bg-orange-500/50'}`}></span>}
            <span className="capitalize">{s === 'all' ? 'All Stores' : s}</span>
            {unavailable && <span className="text-[10px] opacity-60">N/A</span>}
          </button>
        );
      })}
    </div>
  );
}

