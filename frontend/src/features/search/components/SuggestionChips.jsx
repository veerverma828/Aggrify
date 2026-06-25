import React from 'react';
import { SUGGESTION_ITEMS, SUGGESTION_CHIPS } from '../constants/searchConstants';

export default function SuggestionChips({ onChipClick, variant = 'home' }) {
  if (variant === 'home') {
    return (
      <div className="flex flex-col space-y-1.5 pt-0.5">
        <span className="text-[8px] font-black text-center text-zinc-600 uppercase tracking-widest">Suggested items</span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {SUGGESTION_ITEMS.map(({ label, query, icon }) => (
            <button
              key={query}
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-900 bg-zinc-900/10 text-[10px] font-semibold text-zinc-500 hover:border-rose-500/25 hover:text-rose-455 hover:bg-rose-500/5 transition-all duration-150"
              onClick={() => onChipClick(query)}
            >
              <i className={`ti ${icon}`} aria-hidden="true"></i>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-550 font-bold uppercase tracking-wider">
      <span>Try searching:</span>
      <div className="flex flex-wrap gap-2">
        {SUGGESTION_CHIPS.map(chip => (
          <button 
            key={chip.query} 
            className="px-3.5 py-1.5 rounded-xl border border-zinc-900 bg-zinc-900/20 text-zinc-450 hover:bg-rose-500/5 hover:border-rose-500/25 hover:text-rose-455 transition-all duration-150 text-[10px] font-bold"
            onClick={() => onChipClick(chip.query)}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
