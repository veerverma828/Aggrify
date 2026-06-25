import React from 'react';

export default function FeatureHighlightGrid() {
  return (
    <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full pt-6 border-t border-zinc-900/60 mt-2">
      <div className="flex flex-col items-center md:items-start text-center md:text-left p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm space-y-1.5">
        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-405 flex items-center justify-center">
          <i className="ti ti-bolt text-sm"></i>
        </div>
        <h3 className="text-white font-bold text-xs">Live Scrapers</h3>
        <p className="text-zinc-500 text-[9px] leading-relaxed font-semibold">
          SSE connection streams matching products and live catalog details straight from active grocery databases.
        </p>
      </div>
      <div className="flex flex-col items-center md:items-start text-center md:text-left p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm space-y-1.5">
        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-405 flex items-center justify-center">
          <i className="ti ti-git-merge text-sm"></i>
        </div>
        <h3 className="text-white font-bold text-xs">Unified Merging</h3>
        <p className="text-zinc-500 text-[9px] leading-relaxed font-semibold">
          Proprietary word-overlap parsing automatically aggregates different store layouts into single unified cards.
        </p>
      </div>
      <div className="flex flex-col items-center md:items-start text-center md:text-left p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm space-y-1.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-405 flex items-center justify-center">
          <i className="ti ti-tag text-sm"></i>
        </div>
        <h3 className="text-white font-bold text-xs">Best Deal Indicator</h3>
        <p className="text-zinc-500 text-[9px] leading-relaxed font-semibold">
          Instantly spots and highlights the cheaper delivery channel, guiding checkout to ensure savings.
        </p>
      </div>
    </div>
  );
}
