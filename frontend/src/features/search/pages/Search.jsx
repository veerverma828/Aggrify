import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import StoreSelector from '../components/StoreSelector';
import SuggestionChips from '../components/SuggestionChips';
import { getSearchEventSource } from '../services/searchApi';
import { areProductsSame, parsePrice, getMatchKey } from '../utils/matching';

export default function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const queryParam = searchParams.get('q') || '';
  const sourceParam = searchParams.get('source') || 'all';

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

  const performSearch = (query, searchSource) => {
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

    const es = getSearchEventSource(query, searchSource);
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
      console.error('EventSource stream error event:', event);
      let errorMsg = 'An error occurred while connecting to the scraping server.';
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          errorMsg = data.error || errorMsg;
        }
      } catch (e) {
        console.error('Failed to parse error event:', e);
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
      performSearch(queryParam, sourceParam);
    } else {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam, sourceParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim(), source: sourceParam });
    }
  };

  const handleSourceChange = (newSource) => {
    localStorage.setItem('aggrify_source', newSource);
    setSearchParams({ q: queryParam, source: newSource });
  };

  const handleRetryClick = () => {
    performSearch(queryParam, sourceParam);
  };

  const handleChipClick = (chipQuery) => {
    setSearchInput(chipQuery);
    setSearchParams({ q: chipQuery, source: sourceParam });
  };

  const filteredProducts = products.filter(product => {
    if (sourceParam === 'all') return true;
    return product.providers && !!product.providers[sourceParam];
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col relative overflow-x-hidden font-sans bg-grid-pattern">
      
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 bg-zinc-950/70 backdrop-blur-md border-b border-zinc-900/60 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-2 shrink-0 animate-pulse" style={{ textDecoration: 'none' }}>
            <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(225,29,72,0.6)]">⚡</span>
            <span className="text-sm font-black bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent uppercase tracking-wider">Aggrify</span>
          </Link>

          <div className="flex-1 w-full max-w-3xl flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input Bar */}
            <form id="search-form" className="flex-1 w-full flex items-center bg-zinc-900/30 backdrop-blur-sm border border-zinc-850 rounded-xl pl-4 pr-1.5 py-1 focus-within:border-zinc-700/80 transition-all duration-200 shadow-inner" onSubmit={handleSearchSubmit}>
              <span className="text-zinc-555 text-sm shrink-0">🔍</span>
              <input 
                type="text" 
                id="search-input" 
                className="flex-1 bg-transparent border-0 outline-none text-zinc-150 placeholder-zinc-600 px-3 py-2 text-xs font-semibold"
                placeholder="Search for milk, bread, butter, cold drinks..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                required 
                autoComplete="off"
                aria-label="Search products"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput('')} className="p-1.5 text-zinc-500 hover:text-zinc-350 mr-1">
                  <i className="ti ti-x text-xs"></i>
                </button>
              )}
              <button type="submit" id="search-btn" className="bg-zinc-900 text-zinc-350 border border-zinc-800 hover:bg-zinc-850 hover:text-white font-black text-[10px] uppercase tracking-wider px-5 py-2 rounded-lg transition-all duration-150 shadow-md shrink-0">Search</button>
            </form>

            {/* Store Tabs */}
            <StoreSelector source={sourceParam} onChange={handleSourceChange} variant="search" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-8 py-8 flex flex-col space-y-6 relative z-10">
        
        {/* Try Suggestion tags */}
        <SuggestionChips onChipClick={handleChipClick} variant="search" />

        {/* Content Section */}
        <section id="content-section" className="space-y-4">
          
          {/* View: Loading skeleton */}
          {view === 'loading' && (
            <div id="loading-view" className="flex flex-col items-center justify-center py-20 space-y-6 bg-zinc-900/10 border border-zinc-900/60 rounded-3xl p-8 backdrop-blur-sm">
              <div className="relative w-10 h-10">
                <div className="w-10 h-10 border-4 border-rose-500/10 border-t-rose-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center text-zinc-400 text-xs font-bold tracking-wider uppercase mt-2">
                <span>
                  {sourceParam === 'all' ? (
                    <>
                      Merging live prices from{' '}
                      <span className="text-emerald-450">Blinkit</span> &amp;{' '}
                      <span className="text-purple-450">Zepto</span>...
                    </>
                  ) : sourceParam === 'blinkit' ? (
                    <>
                      Fetching live prices from{' '}
                      <span className="text-emerald-450">Blinkit</span>...
                    </>
                  ) : (
                    <>
                      Fetching live prices from{' '}
                      <span className="text-purple-450">Zepto</span>...
                    </>
                  )}
                </span>
              </div>
              
              {/* Pulsing card grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full pt-10">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 animate-pulse flex flex-col justify-between space-y-4 h-[320px]" key={num}>
                    <div className="w-full aspect-square bg-zinc-950/50 rounded-xl"></div>
                    <div className="h-3 bg-zinc-950/60 rounded w-5/6"></div>
                    <div className="h-2 bg-zinc-950/40 rounded w-1/3"></div>
                    <div className="space-y-2 pt-2">
                      <div className="h-9 bg-zinc-950/50 rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View: Error message */}
          {view === 'error' && (
            <div id="error-view" className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 bg-zinc-900/10 border border-zinc-900/60 rounded-3xl p-8 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 text-xl font-bold animate-bounce">⚠️</div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">Connection Failure</h2>
              <p id="error-message" className="text-xs text-zinc-450 leading-relaxed font-semibold">{errorMessage}</p>
              <button id="retry-btn" className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-rose-600 hover:brightness-110 text-white font-black rounded-lg text-[10px] uppercase tracking-wider transition-all duration-150 shadow-md" onClick={handleRetryClick}>Retry Search</button>
            </div>
          )}

          {/* View: No Results */}
          {view === 'no-results' && (
            <div id="no-results-view" className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 bg-zinc-900/10 border border-zinc-900/60 rounded-3xl p-8 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-lg">🔍</div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">No matches found</h2>
              <p className="text-xs text-zinc-450 leading-relaxed font-semibold">
                No catalogs matched the query on{' '}
                <span className="text-rose-400 font-bold">
                  {sourceParam === 'all' ? 'Blinkit or Zepto' : sourceParam === 'blinkit' ? 'Blinkit' : 'Zepto'}
                </span>
                . Refine spelling or search for alternative items.
              </p>
            </div>
          )}

          {/* View: Results Display */}
          {view === 'results' && (
            <div id="results-view" className="space-y-6">
              
              {/* Result Statistics Bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-900/60 pb-4">
                <span id="results-count" className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                  {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} located
                </span>
                
                <div className="flex items-center space-x-3">
                  <span id="streaming-status" className={`flex items-center gap-1.5 text-[10px] text-rose-400 font-black bg-rose-500/5 border border-rose-500/20 rounded-full px-3 py-1 ${isStreaming ? 'animate-pulse' : 'hidden'}`}>
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                    {sourceParam === 'all' ? 'Querying live catalogs...' : sourceParam === 'blinkit' ? 'Querying Blinkit catalog...' : 'Querying Zepto catalog...'}
                  </span>

                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-450 px-3 py-1 rounded-full font-bold">
                    {sourceParam === 'all' ? 'All Channels' : sourceParam === 'blinkit' ? 'Blinkit Only' : 'Zepto Only'}
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
                <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto space-y-4 bg-zinc-900/10 border border-zinc-900/60 rounded-3xl p-8 backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-lg">🔍</div>
                  <h2 className="text-base font-black text-white uppercase tracking-wider">No filtered matches</h2>
                  <p className="text-xs text-zinc-450 leading-relaxed font-semibold">No elements match filtered settings. Try toggling other stores.</p>
                </div>
              )}

              {/* Active streaming text footer */}
              {isStreaming && (
                <div className="py-10 flex items-center justify-center gap-2.5 text-zinc-550 text-xs font-bold uppercase tracking-wider animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-rose-500/10 border-t-rose-600 rounded-full animate-spin"></div>
                  <span>Syncing database entries...</span>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 py-8 text-center text-[10px] text-zinc-600 font-semibold uppercase tracking-wider mt-12 bg-zinc-950">
        <p>&copy; 2026 Aggrify. Powered by Playwright Browser Automation + React.</p>
      </footer>
    </div>
  );
}
