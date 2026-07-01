import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import AiAgentPanel from '../components/AiAgentPanel';
import SuggestionChips from '../components/SuggestionChips';
import { Sparkles, Search, ArrowRight, TrendingUp } from 'lucide-react';

const LIVE_INSIGHTS = [
  { 
    item: 'Amul Salted Butter 100g', 
    savings: '22% less', 
    cheaperStore: 'zepto', 
    prices: { blinkit: '₹62', zepto: '₹48' }, 
    query: 'amul butter',
    tag: 'Trending Deal'
  },
  { 
    item: 'Coca-Cola Zero Sugar Can', 
    savings: '12% less', 
    cheaperStore: 'blinkit', 
    prices: { blinkit: '₹35', zepto: '₹40' }, 
    query: 'coke zero',
    tag: 'Best Price'
  },
  { 
    item: 'Lay\'s Classic Salted Chips', 
    savings: '33% less', 
    cheaperStore: 'zepto', 
    prices: { blinkit: '₹30', zepto: '₹20' }, 
    query: 'lays',
    tag: 'Price Drop'
  },
  { 
    item: 'Mother Dairy Toned Milk 1L', 
    savings: '5% less', 
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [placeholder, setPlaceholder] = useState('Search for milk, bread, lays, cold drinks...');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const placeholders = [
      'Search for milk, bread, eggs...',
      'Search for lays chips, Coca-Cola...',
      'Search for amul butter, paneer...',
      'Search for fresh onion, potato...',
      'Search for Surf Excel, Harpic...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % placeholders.length;
      setPlaceholder(placeholders[index]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen w-full flex flex-col bg-bg text-ink font-sans selection:bg-white/20 selection:text-white">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none -z-10" />
      {/* Aurora Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="aurora-glow-purple" />
        <div className="aurora-glow-emerald" />
        <div className="aurora-glow-orange" />
      </div>
      
      {/* Premium Header */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-black/60 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="brand flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-bold text-sm">A</div>
            <span className="hidden sm:inline font-semibold tracking-tight">Aggrify</span>
          </div>
          
          <div className="flex items-center gap-4">
            <LocationSelector
              selectedLocationId={location}
              onChange={handleLocationChange}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-20 md:pt-24 pb-16 px-6 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center max-w-3xl mx-auto w-full mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-ink-muted mb-5 hover:bg-white/10 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald"></span>
            Live real-time aggregation active
          </div>
          
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.1] mb-6">
            Compare grocery prices.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Instantly.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-ink-muted max-w-2xl mb-8 leading-relaxed font-light">
            Search once to scan Blinkit, Zepto, and Swiggy Instamart simultaneously. Find the cheapest basket delivered to your door.
          </p>

          {/* Central Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full relative group search-glow rounded-2xl transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-ink-muted group-focus-within:text-white transition-colors" />
            </div>
            <input 
              id="search-input"
              name="search"
              type="text" 
              placeholder={placeholder} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-32 py-5 text-base md:text-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all shadow-2xl shadow-black/50"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
            <div className="absolute inset-y-2 right-2 flex items-center">
              <button type="submit" className="bg-white text-black hover:bg-neutral-200 px-6 py-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 h-full">
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          {/* Suggestion Chips */}
          <div className="mt-5 w-full animate-in fade-in duration-500 delay-200">
            <SuggestionChips onChipClick={handleChipClick} variant="home" />
          </div>
        </section>

        {/* Live Insights Section */}
        <section className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-ink-muted" /> Current Savings Spotlight
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LIVE_INSIGHTS.map((insight, idx) => {
              const cheaperStoreClass = insight.cheaperStore === 'zepto' 
                ? 'card-zepto' 
                : insight.cheaperStore === 'blinkit' 
                  ? 'card-blinkit' 
                  : 'card-instamart';
              
              const storeDotColor = insight.cheaperStore === 'zepto' 
                ? 'bg-[#8c2de9]' 
                : insight.cheaperStore === 'blinkit' 
                  ? 'bg-[#ffc72c]' 
                  : 'bg-[#ff5c26]';

              return (
                <div 
                  key={idx} 
                  onClick={() => handleChipClick(insight.query)} 
                  className={`glass-panel p-5 rounded-2xl flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:-translate-y-1.5 ${cheaperStoreClass}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="font-medium text-sm leading-snug">{insight.item}</div>
                    <div className="text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {insight.savings}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-ink-muted font-medium uppercase tracking-wider">
                        {insight.cheaperStore === 'zepto' ? 'Blinkit' : 'Zepto'}
                      </span>
                      <span className="text-sm text-ink-muted line-through">
                        {insight.cheaperStore === 'zepto' ? insight.prices.blinkit : insight.prices.zepto}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-white font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${storeDotColor} shadow-[0_0_8px_currentColor]`} />
                        {insight.cheaperStore}
                      </span>
                      <span className="text-xl font-bold text-white">
                        {insight.cheaperStore === 'zepto' ? insight.prices.zepto : insight.prices.blinkit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mt-24 pt-16 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold">Live Scrapers</h3>
            <p className="text-sm text-ink-muted leading-relaxed">Initiates high-performance headless browser workers instantly to fetch real-time grocery data from multiple sources.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-2">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold">Unified Matching</h3>
            <p className="text-sm text-ink-muted leading-relaxed">Proprietary string alignment algorithms seamlessly merge identical products across distinct store catalogs.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 mb-2">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-semibold">Best Deal Tagging</h3>
            <p className="text-sm text-ink-muted leading-relaxed">Automatically highlights the cheapest platform with precise cost difference indicators to maximize your savings.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-emerald"></span>
            All systems operational
          </div>
          <div className="text-xs text-ink-muted">
            &copy; 2026 Aggrify. Aggregate. Compare. Save.
          </div>
        </div>
      </footer>

      {!isAiAgentOpen && (
        <button
          onClick={() => setIsAiAgentOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-8 right-8 z-40 bg-white hover:bg-neutral-200 text-black p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
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
