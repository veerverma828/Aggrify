import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Search as SearchIcon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import StoreSelector from '../components/StoreSelector';
import SuggestionChips from '../components/SuggestionChips';
import { getSearchEventSource } from '../services/searchApi';
import { areProductsSame, parsePrice, getMatchKey } from '../utils/matching';
import LocationSelector from '../components/LocationSelector';
import AiAgentPanel from '../components/AiAgentPanel';
import { LOCATIONS } from '../constants/locationConstants';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const queryParam = searchParams.get('q') || '';
  const sourceParam = searchParams.get('source') || 'all';
  const locationParam = searchParams.get('location') || 'meerut';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('loading'); // loading, error, no-results, results
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Failed to retrieve search results. Please try again.');
  const [unsupportedProviders, setUnsupportedProviders] = useState([]);

  // Derive the active location object for supportedStores lookup
  const activeLocation = LOCATIONS.find(l => l.id === locationParam) || LOCATIONS[0];
  
  const eventSourceRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  const closeStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, []);

  const performSearch = (query, searchSource, searchLocation = 'meerut', refresh = false) => {
    if (!query.trim()) {
      navigate('/');
      return;
    }

    closeStream();

    setView('loading');
    setProducts([]);
    setIsStreaming(false);
    setUnsupportedProviders([]);

    let hasLoadedAny = false;
    let totalReceived = 0;

    const es = getSearchEventSource(query, searchSource, searchLocation, refresh);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.providerStatus && data.providerStatus.status === 'unsupported') {
          setUnsupportedProviders(prev => [...prev, data.providerStatus.provider]);
        }
        if (data.products && data.products.length > 0) {
          if (!hasLoadedAny) {
            hasLoadedAny = true;
            setView('results');
            setIsStreaming(true);
          }
          setProducts(prev => {
            const mergedList = [...prev];

            data.products.forEach(p => {
              const pPrice = parsePrice(p.price);
              // Avoid merging two products from the same provider (e.g. duplicate search results on Blinkit/Zepto)
              const existingIdx = mergedList.findIndex(item => areProductsSame(item, p) && !item.providers[p.provider]);
              
              if (existingIdx !== -1) {
                const existing = mergedList[existingIdx];
                const updatedProviders = {
                  ...existing.providers,
                  [p.provider]: {
                    price: p.price,
                    originalPrice: p.originalPrice,
                    discount: p.discount,
                    delivery: p.delivery,
                    rawPrice: pPrice
                  }
                };

                mergedList[existingIdx] = {
                  ...existing,
                  image: existing.image || p.image,
                  providers: updatedProviders
                };
              } else {
                const newMerged = {
                  id: p.id || getMatchKey(p.title, p.weight),
                  title: p.title,
                  weight: p.weight,
                  image: p.image,
                  providers: {
                    [p.provider]: {
                      price: p.price,
                      originalPrice: p.originalPrice,
                      discount: p.discount,
                      delivery: p.delivery,
                      rawPrice: pPrice
                    }
                  }
                };
                mergedList.push(newMerged);
              }
            });

            return mergedList;
          });
          totalReceived += data.products.length;
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    es.addEventListener('done', () => {
      console.log('Scraping stream finished successfully.');
      closeStream();
      setIsStreaming(false);

      if (totalReceived === 0) {
        setView('no-results');
      }
    });

    es.addEventListener('error', (event) => {
      console.warn('EventSource stream error event:', event);
      let errorMsg = 'An error occurred while connecting to the scraping server.';
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          errorMsg = data.error || errorMsg;
        }
      } catch (e) {
        console.warn('Failed to parse error event:', e);
      }

      setErrorMessage(errorMsg);
      setView('error');
      closeStream();
      setIsStreaming(false);
    });

    es.onerror = () => {
      if (!hasLoadedAny) {
        setErrorMessage('Failed to establish connection to the scraping server.');
        setView('error');
        closeStream();
        setIsStreaming(false);
      } else {
        console.log('Stream connection dropped or ended.');
        closeStream();
        setIsStreaming(false);
      }
    };
  };

  useEffect(() => {
    if (queryParam) {
      const isReload = isInitialMount.current && window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0]?.type === 'reload';
      performSearch(queryParam, sourceParam, locationParam, isReload);
      isInitialMount.current = false;
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, sourceParam, locationParam]);

  const handleLocationChange = (newLocation) => {
    localStorage.setItem('aggrify_location', newLocation);
    setSearchParams({ q: queryParam, source: sourceParam, location: newLocation });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim(), source: sourceParam, location: locationParam });
    }
  };

  const handleSourceChange = (newSource) => {
    localStorage.setItem('aggrify_source', newSource);
    setSearchParams({ q: queryParam, source: newSource, location: locationParam });
  };

  const handleRetryClick = () => {
    performSearch(queryParam, sourceParam, locationParam);
  };

  const handleChipClick = (chipQuery) => {
    setSearchInput(chipQuery);
    setSearchParams({ q: chipQuery, source: sourceParam, location: locationParam });
  };

  const filteredProducts = products.filter(product => {
    if (sourceParam === 'all') return true;
    return product.providers && !!product.providers[sourceParam];
  });

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg text-ink font-sans selection:bg-white/20 selection:text-white">
      {/* Premium Header */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : 'bg-black/60 backdrop-blur-lg border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="brand flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-bold text-sm">A</div>
            <span className="hidden sm:inline font-semibold tracking-tight">Aggrify</span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative group flex w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="w-4 h-4 text-ink-muted group-focus-within:text-white transition-colors" />
              </div>
              <input 
                id="search-input"
                name="search"
                type="text" 
                placeholder="Search products..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </form>
          </div>

          {/* Location Selector */}
          <div className="shrink-0 hidden md:block">
            <LocationSelector
              selectedLocationId={locationParam}
              onChange={handleLocationChange}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12 flex flex-col transition-all duration-300 ${isAiAgentOpen ? 'lg:pr-[400px]' : ''}`}>
        
        {/* Sticky Filters */}
        <div className="sticky top-16 z-30 bg-bg/90 backdrop-blur-md py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-4">
          <StoreSelector
            source={sourceParam}
            onChange={handleSourceChange}
            variant="search"
            supportedStores={activeLocation.supportedStores || null}
            locationName={activeLocation.name || ''}
          />
          <div className="hidden sm:block w-px h-6 bg-white/10"></div>
          <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <SuggestionChips onChipClick={handleChipClick} variant="search" />
          </div>
        </div>

        {/* Content Section */}
        <section className="mt-8">
          
          {/* View: Loading skeleton */}
          {view === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                <p className="text-sm font-medium text-ink-muted">
                  {sourceParam === 'all' 
                    ? 'Merging live prices from Blinkit, Zepto & Instamart...' 
                    : `Fetching live prices from ${sourceParam.charAt(0).toUpperCase() + sourceParam.slice(1)}...`}
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="w-full aspect-square bg-white/5 rounded-2xl animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse"></div>
                    <div className="h-10 bg-white/5 rounded-xl mt-2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View: Error message */}
          {view === 'error' && (
            <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Connection Failure</h2>
                <p className="text-sm text-ink-muted leading-relaxed">{errorMessage}</p>
              </div>
              <button 
                onClick={handleRetryClick}
                className="px-6 py-2.5 bg-white text-black font-medium rounded-xl text-sm transition-colors hover:bg-neutral-200"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* View: No Results */}
          {view === 'no-results' && (
            <div className="flex flex-col items-center justify-center text-center py-32 max-w-md mx-auto space-y-4 animate-in fade-in duration-500">
              <SearchIcon className="w-10 h-10 text-white/20 mb-2" />
              <h2 className="text-lg font-semibold text-white">No matches found</h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                We couldn't find anything for "{searchInput}" on {sourceParam === 'all' ? 'Blinkit, Zepto, or Instamart' : sourceParam.charAt(0).toUpperCase() + sourceParam.slice(1)}. Try another query.
              </p>
            </div>
          )}

          {/* View: Results Display */}
          {view === 'results' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Result Statistics Bar */}
              <div className="flex items-center justify-between text-xs text-ink-muted font-medium">
                <span>{filteredProducts.length} results</span>
                
                {isStreaming && (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Syncing live data...
                  </span>
                )}
              </div>

              {/* Product Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Grid Empty Fallback (when filtered) */}
              {filteredProducts.length === 0 && !isStreaming && (
                <div className="text-center py-20 text-sm text-ink-muted">
                  No elements match the current store filter.
                </div>
              )}

              {/* Unsupported Providers Banner */}
              {unsupportedProviders.length > 0 && (
                <div className="flex flex-col gap-2">
                  {unsupportedProviders.map(provider => (
                    <div key={provider} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-ink-muted">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${provider === 'blinkit' ? 'bg-emerald-500/50' : provider === 'zepto' ? 'bg-purple-500/50' : 'bg-orange-500/50'}`}></span>
                      <span><span className="capitalize font-medium text-white/60">{provider}</span> is not available in <span className="font-medium text-white/60">{activeLocation.name}</span>.</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Streaming Indicator */}
              {isStreaming && (
                <div className="flex justify-center py-12">
                  <div className="flex items-center gap-3 text-sm text-ink-muted font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching more items...
                  </div>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      {/* AI Agent FAB */}
      {!isAiAgentOpen && (
        <button
          onClick={() => setIsAiAgentOpen(true)}
          aria-label="Open AI Assistant"
          className="fixed bottom-8 right-8 z-40 bg-white hover:bg-neutral-200 text-black p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* AI Agent Panel */}
      <AiAgentPanel 
        isOpen={isAiAgentOpen} 
        onClose={() => setIsAiAgentOpen(false)} 
        locationParam={locationParam} 
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

