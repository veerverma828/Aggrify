import React, { useState, useEffect, useRef, memo } from 'react';
import { Routes, Route, useNavigate, useSearchParams, Link } from 'react-router-dom';

const getBrand = (title) => {
  const t = (title || '').toLowerCase();
  const brands = ['lays', 'lay\'s', 'bingo', 'doritos', 'pringles', 'amul', 'mother dairy', 'too yumm', 'haldiram', 'uncle chipps', 'crax', 'snackible', 'beyond snack', 'brb'];
  for (const b of brands) {
    if (t.includes(b.replace(/['’]/g, '')) || t.includes(b)) {
      return b.replace(/['’]/g, '');
    }
  }
  return t.split(/\s+/)[0] || '';
};

const parseWeightVal = (weightStr) => {
  if (!weightStr) return null;
  let str = weightStr.toLowerCase().replace(/\s+/g, '');
  
  str = str
    .replace(/grams?/g, 'g')
    .replace(/litres?/g, 'l')
    .replace(/millilitres?/g, 'ml')
    .replace(/kilograms?/g, 'kg');
    
  const massVolMatches = [...str.matchAll(/(\d+(?:\.\d+)?)(g|kg|ml|l)\b/g)];
  if (massVolMatches.length > 0) {
    const last = massVolMatches[massVolMatches.length - 1];
    return { val: parseFloat(last[1]), unit: last[2] };
  }
  
  const countMatches = [...str.matchAll(/(\d+(?:\.\d+)?)(pcs|pc|units?|packs?)/g)];
  if (countMatches.length > 0) {
    return { val: parseFloat(countMatches[0][1]), unit: countMatches[0][2] };
  }
  
  return null;
};

const getCleanWords = (title) => {
  const fillerWords = new Set([
    'flavour', 'flavor', 'style', 'original', 'taste', 'crunchy', 'crispy', 'crispz',
    'fresh', 'premium', 'gourmet', 'natural', 'pure', 'selected', 'quality',
    'best', 'super', 'real', 'delicious', 'mouthwatering', 'pack', 'packet', 'packs',
    'potato', 'chips', 'wafer', 'wafers', 'and', 'with', 'for', 'of', 'or', 'in'
  ]);
  
  return (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .map(w => {
      if (w === 'limon') return 'lemon';
      if (w === 'chilli') return 'chili';
      if (w === 'lite') return 'light';
      return w;
    })
    .filter(w => w && !fillerWords.has(w));
};

const areProductsSame = (p1, p2) => {
  const brand1 = getBrand(p1.title);
  const brand2 = getBrand(p2.title);
  if (brand1 !== brand2) return false;

  const w1 = parseWeightVal(p1.weight);
  const w2 = parseWeightVal(p2.weight);
  if (w1 && w2) {
    if (w1.unit !== w2.unit) return false;
    const ratio = w1.val / w2.val;
    if (ratio < 0.8 || ratio > 1.25) return false;
  } else if ((p1.weight && !p2.weight) || (!p1.weight && p2.weight)) {
    return false;
  }

  const words1 = getCleanWords(p1.title);
  const words2 = getCleanWords(p2.title);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const intersection = words1.filter(w => words2.includes(w));
  const overlapRatio = intersection.length / Math.min(words1.length, words2.length);
  
  return overlapRatio >= 0.7;
};

const getMatchKey = (title, weight) => {
  const normTitle = (title || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
  const normWeight = (weight || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/grams?/g, 'g')
    .replace(/litres?/g, 'l')
    .replace(/millilitres?/g, 'ml')
    .replace(/kilograms?/g, 'kg');
  return `${normTitle}|${normWeight}`;
};

const parsePrice = (priceStr) => {
  if (!priceStr) return Infinity;
  const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? Infinity : num;
};

const ProductCard = memo(function ProductCard({ product }) {
  const imgUrl = product.image || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=300&auto=format&fit=crop&q=60';
  
  // Ensure providers object exists
  const providers = product.providers || {
    [product.provider || 'unknown']: {
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      delivery: product.delivery,
      rawPrice: parsePrice(product.price)
    }
  };

  const offersList = Object.entries(providers).map(([name, info]) => ({
    name,
    ...info
  }));

  // Sort offers cheapest first
  offersList.sort((a, b) => a.rawPrice - b.rawPrice);

  const cheapestOffer = offersList[0] || {};
  
  // Find the best discount
  const bestDiscount = (offersList.find(o => o.discount) || {}).discount;

  return (
    <div className="product-card" data-id={product.id}>
      {offersList.length > 1 ? (
        <span className="store-badge provider-compared">⚡ Aggregated</span>
      ) : (
        <span className={`store-badge provider-${cheapestOffer.name}`}>
          {cheapestOffer.name === 'blinkit' ? 'Blinkit' : cheapestOffer.name === 'zepto' ? 'Zepto' : cheapestOffer.name}
        </span>
      )}

      {bestDiscount && (
        <div className="badge-container">
          <span className="card-badge discount-badge">{bestDiscount}</span>
        </div>
      )}

      <div className="product-img-wrapper">
        <img className="product-img" src={imgUrl} alt={product.title} loading="lazy" />
      </div>

      <div className="product-details">
        <h3 className="product-title" title={product.title}>{product.title}</h3>
        <span className="product-weight">{product.weight || '\u00a0'}</span>
        
        <div className="comparison-container">
          {offersList.map((offer, index) => (
            <div key={offer.name} className={`comparison-row ${index === 0 && offersList.length > 1 ? 'best-price' : ''}`}>
              <div className="provider-info">
                <span className={`store-dot dot-${offer.name}`}></span>
                <span className="provider-name">{offer.name === 'blinkit' ? 'Blinkit' : offer.name === 'zepto' ? 'Zepto' : offer.name}</span>
              </div>
              <div className="price-details-col">
                <div className="price-info">
                  {offer.originalPrice && <span className="comparison-original-price">{offer.originalPrice}</span>}
                  <span className="comparison-price">{offer.price || 'N/A'}</span>
                </div>
                {offer.delivery && (
                  <span className="comparison-delivery">⏱️ {offer.delivery}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

function Home() {
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

  const suggestionChips = [
    { label: '🥛 Milk', query: 'milk' },
    { label: '🍞 Bread', query: 'bread' },
    { label: '🥔 Chips', query: 'chips' },
    { label: '🍦 Ice Cream', query: 'ice cream' }
  ];

  return (
    <div className="app-container" style={{ minHeight: '100vh', justifyContent: 'center' }}>
      <main className="landing-hero">
        <div className="landing-logo">
          <span className="landing-logo-icon">⚡</span>
          <h1 className="landing-logo-text">Aggrify</h1>
          <p className="landing-tagline">
            Search & compare product listings, prices, and delivery times from <strong>Blinkit & Zepto</strong> in real-time.
          </p>
        </div>

        <div className="landing-search-container">
          <form id="search-form" className="search-box" onSubmit={handleSearchSubmit}>
            <div className="input-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                id="search-input" 
                placeholder="Search for milk, bread, butter, cold drinks..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                required 
                autoComplete="off"
                aria-label="Search products"
              />
              <button type="submit" id="search-btn">Search</button>
            </div>
          </form>

          <div className="source-selector">
            <button 
              type="button" 
              className={`source-tab ${source === 'all' ? 'active' : ''}`}
              onClick={() => handleSourceChange('all')}
            >
              🚀 All
            </button>
            <button 
              type="button" 
              className={`source-tab ${source === 'blinkit' ? 'active' : ''}`}
              onClick={() => handleSourceChange('blinkit')}
            >
              🟢 Blinkit
            </button>
            <button 
              type="button" 
              className={`source-tab ${source === 'zepto' ? 'active' : ''}`}
              onClick={() => handleSourceChange('zepto')}
            >
              🟣 Zepto
            </button>
          </div>
        </div>

        <div className="landing-suggestions">
          <span>Try searching:</span>
          <div className="suggestion-chips">
            {suggestionChips.map(chip => (
              <button 
                key={chip.query} 
                className="chip" 
                onClick={() => handleChipClick(chip.query)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="app-footer" style={{ marginTop: 'auto' }}>
        <p>&copy; 2026 Aggrify. Powered by Playwright Browser Automation + React.</p>
      </footer>
    </div>
  );
}

function Search() {
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

  // Sync state if URL changes directly (e.g. back/forward navigation)
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

    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${apiBaseUrl}/api/search?q=${encodeURIComponent(query.trim())}&source=${searchSource}`;
    const es = new EventSource(url);
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

  // Run the search when the URL query/source params change
  useEffect(() => {
    if (queryParam) {
      performSearch(queryParam, sourceParam);
    } else {
      navigate('/');
    }
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

  const suggestionChips = [
    { label: '🥛 Milk', query: 'milk' },
    { label: '🍞 Bread', query: 'bread' },
    { label: '🥔 Chips', query: 'chips' },
    { label: '🍦 Ice Cream', query: 'ice cream' }
  ];

  const filteredProducts = products.filter(product => {
    if (sourceParam === 'all') return true;
    return product.providers && !!product.providers[sourceParam];
  });

  return (
    <div className="app-container">
      <header className="app-top-bar">
        <Link to="/" className="logo-area" style={{ textDecoration: 'none' }}>
          <span className="logo-icon">⚡</span>
          <h1 className="logo-text">Aggrify</h1>
        </Link>

        <div className="header-search-group">
          {/* Search Form */}
          <form id="search-form" className="search-box" onSubmit={handleSearchSubmit}>
            <div className="input-wrapper">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                id="search-input" 
                placeholder="Search for milk, bread, butter, cold drinks..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                required 
                autoComplete="off"
                aria-label="Search products"
              />
              <button type="submit" id="search-btn">Search</button>
            </div>
          </form>

          {/* Source Selector Control */}
          <div className="source-selector">
            <button 
              type="button" 
              className={`source-tab ${sourceParam === 'all' ? 'active' : ''}`}
              onClick={() => handleSourceChange('all')}
            >
              🚀 All
            </button>
            <button 
              type="button" 
              className={`source-tab ${sourceParam === 'blinkit' ? 'active' : ''}`}
              onClick={() => handleSourceChange('blinkit')}
            >
              🟢 Blinkit
            </button>
            <button 
              type="button" 
              className={`source-tab ${sourceParam === 'zepto' ? 'active' : ''}`}
              onClick={() => handleSourceChange('zepto')}
            >
              🟣 Zepto
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Quick suggestions */}
        <div className="suggestions">
          <span>Try searching:</span>
          <div className="suggestion-chips">
            {suggestionChips.map(chip => (
              <button 
                key={chip.query} 
                className="chip" 
                onClick={() => handleChipClick(chip.query)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <section id="content-section" className="content-section">
          
          {/* Loading Skeleton Grid */}
          {view === 'loading' && (
            <div id="loading-view" className="loading-view">
              <div className="scraping-indicator">
                <div className="spinner"></div>
                <span>
                  Running Playwright Scraper on{' '}
                  {sourceParam === 'all' ? 'Blinkit & Zepto' : sourceParam === 'blinkit' ? 'Blinkit' : 'Zepto'}...
                </span>
              </div>
              <div className="products-grid-skeleton">
                {[1, 2, 3, 4].map(num => (
                  <div className="skeleton-card" key={num}>
                    <div className="skeleton-img shimmer"></div>
                    <div className="skeleton-line skeleton-title shimmer"></div>
                    <div className="skeleton-line skeleton-meta shimmer"></div>
                    <div className="skeleton-row">
                      <div className="skeleton-line skeleton-price shimmer"></div>
                      <div className="skeleton-line skeleton-btn shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error View */}
          {view === 'error' && (
            <div id="error-view" className="error-view status-view">
              <div className="icon-illustration">⚠️</div>
              <h2>Something went wrong</h2>
              <p id="error-message">{errorMessage}</p>
              <button id="retry-btn" className="action-btn" onClick={handleRetryClick}>Retry</button>
            </div>
          )}

          {/* No Results View */}
          {view === 'no-results' && (
            <div id="no-results-view" className="no-results-view status-view">
              <div className="icon-illustration">🔍</div>
              <h2>No products found</h2>
              <p>
                We couldn't find any products matching your search on{' '}
                {sourceParam === 'all' ? 'Blinkit or Zepto' : sourceParam === 'blinkit' ? 'Blinkit' : 'Zepto'}. Try checking the spelling or searching for a different item.
              </p>
            </div>
          )}

          {/* Results View */}
          {view === 'results' && (
            <div id="results-view" className="results-view">
              <div className="results-header">
                <span id="results-count" className="results-count">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </span>
                
                <span id="streaming-status" className={`streaming-status ${isStreaming ? '' : 'hidden'}`}>
                  <span className="small-spinner"></span>
                  Scraping live...
                </span>

                <span className="provider-badge">
                  {sourceParam === 'all' ? 'Blinkit & Zepto Scraped' : sourceParam === 'blinkit' ? 'Blinkit' : 'Zepto' + ' Scraped'}
                </span>
              </div>

              <div id="products-grid" className="products-grid">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {filteredProducts.length === 0 && !isStreaming && (
                <div className="no-results-view status-view" style={{ padding: '4rem 2rem' }}>
                  <div className="icon-illustration">🔍</div>
                  <h2>No products found on {sourceParam === 'blinkit' ? 'Blinkit' : 'Zepto'}</h2>
                  <p>Try switching to the other store tab or "All" to see results.</p>
                </div>
              )}

              {/* Live Scraping Indicator */}
              {isStreaming && (
                <div className="infinite-scroll-trigger" style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  color: 'var(--text-secondary)',
                  fontWeight: '600'
                }}>
                  <span className="small-spinner"></span>
                  Scraping live...
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 Aggrify. Powered by Playwright Browser Automation + React.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <>
      {/* Decorative Background Glows */}
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      <div className="glow glow-3"></div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
      </Routes>
    </>
  );
}

export default App;
