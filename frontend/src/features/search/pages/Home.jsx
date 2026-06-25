import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StoreSelector from '../components/StoreSelector';
import SuggestionChips from '../components/SuggestionChips';
import FeatureHighlightGrid from '../components/FeatureHighlightGrid';

export default function Home() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [source, setSource] = useState(() => {
    return localStorage.getItem('aggrify_source') || 'all';
  });

  const handleSourceChange = (newSource) => {
    setSource(newSource);
    localStorage.setItem('aggrify_source', newSource);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&source=${source}`);
    }
  };

  const handleChipClick = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}&source=${source}`);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-200 flex flex-col relative overflow-x-hidden font-sans bg-grid-pattern pb-12">
      <h2 className="sr-only">Aggrify — Compare prices across Blinkit &amp; Zepto</h2>

      {/* Decorative Glow elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Header Navbar */}
      <header className="w-full border-b border-zinc-900/60 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl filter drop-shadow-[0_0_8px_rgba(225,29,72,0.6)]">⚡</span>
            <span className="text-sm font-black uppercase tracking-widest bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Aggrify</span>
          </div>
          <div className="flex items-center space-x-6 text-xs font-semibold text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
            <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Scrapers Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Landing Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-4 md:py-6 flex flex-col items-center justify-center relative z-10 text-center space-y-6">
        
        {/* Pill Tag */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-zinc-800/80 bg-zinc-900/40 text-[9px] font-bold text-zinc-450 uppercase tracking-wider backdrop-blur-md">
          <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Hyperlocal Commerce Aggregator</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-white max-w-2xl font-display">
            Compare quick commerce prices <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-500">in real-time.</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-zinc-450 max-w-md mx-auto leading-relaxed font-medium">
            Compare prices, check availability, and view live delivery times from Blinkit and Zepto side-by-side. Save money instantly.
          </p>
        </div>

        {/* Search Console */}
        <div className="w-full max-w-xl space-y-3.5">
          <form className="w-full bg-zinc-900/30 backdrop-blur-xl border border-zinc-850 rounded-2xl p-1.5 flex items-center shadow-2xl focus-within:border-zinc-700/80 focus-within:ring-2 focus-within:ring-rose-500/5 transition-all duration-300" onSubmit={handleSearchSubmit}>
            <div className="text-zinc-555 ml-2.5 flex items-center justify-center shrink-0">
              <i className="ti ti-search text-sm" aria-hidden="true"></i>
            </div>
            <input
              className="flex-1 bg-transparent border-0 outline-none text-zinc-100 placeholder-zinc-650 px-2.5 py-1.5 text-xs font-semibold"
              type="text"
              placeholder="Search milk, bread, snacks, household items..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              aria-label="Search products"
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput('')} className="p-1.5 text-zinc-500 hover:text-zinc-350 mr-1 shrink-0">
                <i className="ti ti-x text-xs"></i>
              </button>
            )}
            <button type="submit" className="bg-zinc-900 text-zinc-350 border border-zinc-800 hover:bg-zinc-850 hover:text-white font-black text-[9px] uppercase tracking-wider px-4.5 py-2 rounded-xl shadow-md transition-all duration-150 active:scale-[0.97] shrink-0">
              Compare
            </button>
          </form>

          {/* Store Selector pills */}
          <StoreSelector source={source} onChange={handleSourceChange} variant="home" />
        </div>

        {/* Suggested Chips */}
        <SuggestionChips onChipClick={handleChipClick} variant="home" />

        {/* Feature Highlights Grid */}
        <FeatureHighlightGrid />

      </main>
    </div>
  );
}
