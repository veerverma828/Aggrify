import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import AiAgentPanel from '../components/AiAgentPanel';
import { Sparkles } from 'lucide-react';

const LIVE_INSIGHTS = [
  { 
    item: 'Amul Salted Butter 100g', 
    savings: '▼ 22% SAVE', 
    cheaperStore: 'zepto', 
    prices: { blinkit: '₹62', zepto: '₹48' }, 
    query: 'amul butter',
    tag: 'Trending Deal'
  },
  { 
    item: 'Coca-Cola Zero Sugar Can', 
    savings: '▼ 12% SAVE', 
    cheaperStore: 'blinkit', 
    prices: { blinkit: '₹35', zepto: '₹40' }, 
    query: 'coke zero',
    tag: 'Best Price'
  },
  { 
    item: 'Lay\'s Classic Salted Chips', 
    savings: '▼ 33% SAVE', 
    cheaperStore: 'zepto', 
    prices: { blinkit: '₹30', zepto: '₹20' }, 
    query: 'lays',
    tag: 'Price Drop'
  },
  { 
    item: 'Mother Dairy Toned Milk 1L', 
    savings: '▼ 5% SAVE', 
    cheaperStore: 'blinkit', 
    prices: { blinkit: '₹54', zepto: '₹57' }, 
    query: 'mother dairy milk',
    tag: 'Popular'
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [location, setLocation] = useState(() => {
    return localStorage.getItem('aggrify_location') || 'meerut';
  });

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
    localStorage.setItem('aggrify_location', newLocation);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&source=all&location=${location}`);
    }
  };

  const handleChipClick = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}&source=all&location=${location}`);
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-bg text-ink lg:overflow-hidden">
      <header className="border-b-2 border-ink bg-bg z-50">
        <div className="flex items-center justify-between h-16 px-4 md:px-0 md:grid md:grid-cols-[240px_1fr_300px] items-stretch">
          {/* Logo */}
          <div className="brand flex items-center px-2 md:px-8 border-r-0 md:border-r border-ink-faint">
            <span className="hidden sm:inline">Aggrify<span className="text-accent">.</span></span>
            <span className="inline sm:hidden text-accent text-xl font-black">A.</span>
          </div>
          {/* Search bar */}
          <div className="flex-1 flex items-center px-2 md:px-4">
            <form onSubmit={handleSearchSubmit} className="flex w-full bg-ink-faint rounded-[4px] p-0.5 border border-transparent focus-within:border-accent">
              <input 
                type="text" 
                placeholder="Search amul butter, milk, lays, cold drinks..." 
                className="flex-1 bg-transparent border-none text-ink text-xs md:text-sm px-2.5 py-1.5 outline-none font-sans"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="bg-accent text-white border-none px-4 rounded-[2px] font-mono text-[10px] md:text-xs font-bold uppercase cursor-pointer tracking-wider">Execute</button>
            </form>
          </div>
          {/* Location Selector */}
          <div className="flex items-center justify-end px-2 md:px-8 border-l-0 md:border-l border-ink-faint gap-3 md:gap-6">
            <div className="hidden md:inline label">Location</div>
            <div className="bg-ink text-bg px-2 py-0.5 md:py-1 rounded-[2px] font-mono text-[9px] md:text-[10px] font-bold">
              <LocationSelector
                  selectedLocationId={location}
                  onChange={handleLocationChange}
                  activeTheme={{}}
                  customTrigger={true}
                />
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 md:p-8 flex flex-col lg:grid lg:grid-cols-[1fr_350px] gap-8 lg:overflow-hidden flex-1">
        <div className="lg:overflow-y-auto lg:pr-4 pb-12 flex-1">
          <section className="mb-12 md:mb-16">
            <div className="label mb-4">[ System Protocol 01 ]</div>
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[0.85] tracking-[-0.06em] uppercase mb-6 font-display">
              Compare Prices<br/><span className="text-accent">Instantly.</span>
            </h1>
            <p className="max-w-[500px] text-[1.1rem] leading-[1.6] opacity-70">
              Instantly aggregate products, prices, discounts, and real-time delivery estimates side-by-side from Blinkit, Zepto, and Swiggy Instamart.
            </p>
          </section>

          <div className="label mb-6">Current Savings Spotlight</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {LIVE_INSIGHTS.map((insight, idx) => (
              <div key={idx} onClick={() => handleChipClick(insight.query)} className="glass p-6 flex flex-col justify-between hover:border-accent cursor-pointer transition-colors min-h-[140px]">
                <div className="flex justify-between items-start mb-4">
                  <div className="font-bold text-sm max-w-[70%]">{insight.item}</div>
                  <div className="text-emerald-500 text-[11px] font-mono">{insight.savings}</div>
                </div>
                <div className="flex justify-between items-baseline pt-4 border-t border-dashed border-ink-faint">
                  <div className="label flex items-center gap-2">
                    {insight.cheaperStore === 'zepto' ? 'Blinkit' : 'Zepto'} 
                    <span className="line-through opacity-50">{insight.cheaperStore === 'zepto' ? insight.prices.blinkit : insight.prices.zepto}</span>
                  </div>
                  <div className="font-mono text-xl font-bold flex items-center gap-2">
                    <span className="text-[10px] uppercase opacity-50 font-sans tracking-widest">{insight.cheaperStore}</span>
                    {insight.cheaperStore === 'zepto' ? insight.prices.zepto : insight.prices.blinkit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-ink-faint pt-6 lg:pt-0 lg:pl-8 flex flex-col gap-6 lg:gap-8 lg:overflow-y-auto pb-12">
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-xs text-accent tracking-widest uppercase">Live Scrawlers</h4>
            <p className="text-sm opacity-60 leading-[1.5]">Initiates high-performance headless browser workers instantly to fetch real-time grocery data.</p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-xs text-accent tracking-widest uppercase">Unified Matching</h4>
            <p className="text-sm opacity-60 leading-[1.5]">Proprietary string alignment algorithms align and merge diverse products across distinct stores.</p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-xs text-accent tracking-widest uppercase">Best Deal Tagging</h4>
            <p className="text-sm opacity-60 leading-[1.5]">Automatically highlights the cheapest platform with precise cost difference indicators.</p>
          </div>

          <div className="mt-auto pt-8">
            <div className="label mb-4">Protocol Info</div>
            <div className="flex flex-col gap-2">
              <h4 className="font-mono text-xs text-accent tracking-widest uppercase">VERSION 2.6.0</h4>
              <p className="text-sm opacity-60 leading-[1.5]">Aggrify is a discovery engine. Highlights the cheapest store hub matching your current coordinates.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="min-h-12 py-3 flex flex-col sm:flex-row items-center justify-between px-6 md:px-8 gap-3 border-t border-ink-faint bg-black text-center sm:text-left">
        <div className="label flex items-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Live Crawling Active
        </div>
        <div className="label text-[9px] sm:text-xs">© 2026 AGGRIFY AGENT — AGGREGATE. COMPARE. SAVE.</div>
      </footer>

      {!isAiAgentOpen && (
        <button
          onClick={() => setIsAiAgentOpen(true)}
          className="fixed bottom-16 right-8 z-40 bg-accent hover:bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      <AiAgentPanel 
        isOpen={isAiAgentOpen} 
        onClose={() => setIsAiAgentOpen(false)} 
        locationParam={location} 
      />
    </div>
  );
}
