import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import StoreSelector from '../components/StoreSelector';
import SuggestionChips from '../components/SuggestionChips';
import { getSearchEventSource } from '../services/searchApi';
import { areProductsSame, parsePrice, getMatchKey } from '../utils/matching';
import LocationSelector from '../components/LocationSelector';
import AiAgentPanel from '../components/AiAgentPanel';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);

  const queryParam = searchParams.get('q') || '';
  const sourceParam = searchParams.get('source') || 'all';
  const locationParam = searchParams.get('location') || 'meerut';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('loading'); // loading, error, no-results, results
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Failed to retrieve search results. Please try again.');
  
  const eventSourceRef = useRef(null);

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

  const performSearch = (query, searchSource, searchLocation = 'meerut') => {
    if (!query.trim()) {
      navigate('/');
      return;
    }

    closeStream();

    setView('loading');
    setProducts([]);
    setIsStreaming(false);

    let hasLoadedAny = false;
    let totalReceived = 0;

    const es = getSearchEventSource(query, searchSource, searchLocation);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
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
              const existingIdx = mergedList.findIndex(item => areProductsSame(item, p));
              
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
      performSearch(queryParam, sourceParam, locationParam);
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
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-bg text-ink lg:overflow-hidden">
      
      <header className="border-b-2 border-ink bg-bg z-50">
        <div className="flex items-center justify-between h-16 px-4 md:px-0 md:grid md:grid-cols-[240px_1fr_300px] items-stretch">
          {/* Logo */}
          <div className="brand flex items-center px-2 md:px-8 border-r-0 md:border-r border-ink-faint">
            <Link to="/" className="text-ink no-underline hover:opacity-80 flex items-center">
              <span className="hidden sm:inline">Aggrify<span className="text-accent">.</span></span>
              <span className="inline sm:hidden text-accent text-xl font-black">A.</span>
            </Link>
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
                  selectedLocationId={locationParam}
                  onChange={handleLocationChange}
                  activeTheme={{}}
                  customTrigger={true}
                />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={`flex-1 w-full mx-auto p-6 md:p-8 flex flex-col space-y-6 lg:overflow-y-auto relative z-10 transition-all duration-300 ${isAiAgentOpen ? 'lg:mr-[450px] lg:max-w-[calc(100%-450px)]' : ''}`}>
        
        {/* Try Suggestion tags & Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-ink-faint pb-4">
            <StoreSelector source={sourceParam} onChange={handleSourceChange} variant="search" />
            <div className="hidden sm:block w-px h-6 bg-ink-faint"></div>
            <SuggestionChips onChipClick={handleChipClick} variant="search" />
          </div>
        </div>

        {/* Content Section */}
        <section id="content-section" className="space-y-4">
          
          {/* View: Loading skeleton */}
          {view === 'loading' && (
            <div id="loading-view" className="flex flex-col items-center justify-center py-20 space-y-6 glass rounded-md p-8">
              <div className="relative w-10 h-10">
                <div className="w-10 h-10 border-4 border-accent/10 border-t-accent rounded-full animate-spin"></div>
              </div>
              <div className="text-center font-mono text-xs tracking-widest uppercase opacity-70 mt-2">
                <span>
                  {sourceParam === 'all' ? (
                    <>
                      Merging live prices from Blinkit, Zepto & Instamart...
                    </>
                  ) : sourceParam === 'blinkit' ? (
                    <>
                      Fetching live prices from Blinkit...
                    </>
                  ) : sourceParam === 'zepto' ? (
                    <>
                      Fetching live prices from Zepto...
                    </>
                  ) : (
                    <>
                      Fetching live prices from Instamart...
                    </>
                  )}
                </span>
              </div>
              
              {/* Pulsing card grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full pt-10">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <div className="bg-ink-faint border border-ink-faint rounded-md p-4 animate-pulse flex flex-col justify-between space-y-4 h-[320px]" key={num}>
                    <div className="w-full aspect-square bg-white/5 rounded-[4px]"></div>
                    <div className="h-3 bg-white/10 rounded-[2px] w-5/6"></div>
                    <div className="h-2 bg-white/10 rounded-[2px] w-1/3"></div>
                    <div className="space-y-2 pt-2">
                      <div className="h-9 bg-white/10 rounded-[2px]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View: Error message */}
          {view === 'error' && (
            <div id="error-view" className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 glass rounded-md p-8">
              <h2 className="text-base font-black text-white uppercase tracking-wider font-display">Connection Failure</h2>
              <p id="error-message" className="text-sm opacity-70 leading-relaxed">{errorMessage}</p>
              <button id="retry-btn" className="px-5 py-2.5 bg-accent text-white font-mono font-bold rounded-[2px] text-xs uppercase tracking-widest transition-all hover:bg-orange-600" onClick={handleRetryClick}>Retry Search</button>
            </div>
          )}

          {/* View: No Results */}
          {view === 'no-results' && (
            <div id="no-results-view" className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 glass rounded-md p-8">
              <h2 className="text-base font-black text-white uppercase tracking-wider font-display">No matches found</h2>
              <p className="text-sm opacity-70 leading-relaxed">
                No catalogs matched the query on {sourceParam === 'all' ? 'Blinkit, Zepto, or Instamart' : sourceParam === 'blinkit' ? 'Blinkit' : sourceParam === 'zepto' ? 'Zepto' : 'Instamart'}. Refine spelling or search for alternative items.
              </p>
            </div>
          )}

          {/* View: Results Display */}
          {view === 'results' && (
            <div id="results-view" className="space-y-6">
              
              {/* Result Statistics Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-ink-faint pb-4">
                <span id="results-count" className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} located
                </span>
                
                <div className="flex items-center space-x-4">
                  <span id="streaming-status" className={`flex items-center gap-2 font-mono text-[10px] text-accent font-bold uppercase tracking-widest ${isStreaming ? 'animate-pulse' : 'hidden'}`}>
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                    {sourceParam === 'all' ? 'Querying live catalogs...' : sourceParam === 'blinkit' ? 'Querying Blinkit catalog...' : sourceParam === 'zepto' ? 'Querying Zepto catalog...' : 'Querying Instamart catalog...'}
                  </span>
                </div>
              </div>

              {/* Product Card Grid */}
              <div id="products-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Grid Empty Fallback */}
              {filteredProducts.length === 0 && !isStreaming && (
               <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 glass rounded-md p-8">
                  <h2 className="text-base font-black text-white uppercase tracking-wider font-display">No filtered matches</h2>
                  <p className="text-sm opacity-70 leading-relaxed">No elements match filtered settings. Try toggling other stores.</p>
                </div>
              )}

              {/* Active streaming text footer */}
              {isStreaming && (
                <div className="py-10 flex items-center justify-center gap-3 font-mono text-[10px] opacity-50 font-bold uppercase tracking-widest animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-ink-faint border-t-accent rounded-full animate-spin"></div>
                  <span>Syncing database entries...</span>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      <footer className="min-h-12 py-3 flex flex-col sm:flex-row items-center justify-between px-6 md:px-8 gap-3 border-t border-ink-faint bg-black text-center sm:text-left">
        <div className="label flex items-center">
          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Live Crawling Active
        </div>
        <div className="label text-[9px] sm:text-xs">© 2026 AGGRIFY AGENT — AGGREGATE. COMPARE. SAVE.</div>
      </footer>

      {/* AI Agent FAB */}
      {!isAiAgentOpen && (
        <button
          onClick={() => setIsAiAgentOpen(true)}
          className="fixed bottom-16 right-8 z-40 bg-accent hover:bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105"
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
    </div>
  );
}

