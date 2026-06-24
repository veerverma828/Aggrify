import React, { useState, useEffect, useRef, memo } from 'react';

const ProductCard = memo(function ProductCard({ product }) {
  const imgUrl = product.image || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=300&auto=format&fit=crop&q=60';
  return (
    <div className="product-card" data-id={product.id}>
      {(product.discount || product.delivery) && (
        <div className="badge-container">
          {product.discount && <span className="card-badge discount-badge">{product.discount}</span>}
          {product.delivery && (
            <span className="card-badge delivery-badge">
              ⏱️ {product.delivery}
            </span>
          )}
        </div>
      )}
      <div className="product-img-wrapper">
        <img className="product-img" src={imgUrl} alt={product.title} loading="lazy" />
      </div>
      <div className="product-details">
        <h3 className="product-title" title={product.title}>{product.title}</h3>
        <span className="product-weight">{product.weight || '\u00a0'}</span>
        <div className="product-price-row">
          <span className="current-price">{product.price || 'N/A'}</span>
          {product.originalPrice && <span className="original-price">{product.originalPrice}</span>}
        </div>
      </div>
    </div>
  );
});

function App() {
  const [searchInput, setSearchInput] = useState('');
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('welcome'); // welcome, loading, error, no-results, results
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Failed to retrieve search results. Please try again.');
  
  const eventSourceRef = useRef(null);

  // Quick search suggestion chips
  const suggestionChips = [
    { label: '🥛 Milk', query: 'milk' },
    { label: '🍞 Bread', query: 'bread' },
    { label: '🥔 Chips', query: 'chips' },
    { label: '🍦 Ice Cream', query: 'ice cream' }
  ];

  // Clean up SSE connection on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const closeStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const performSearch = (query) => {
    if (!query.trim()) return;

    // Close any previous stream
    closeStream();

    setView('loading');
    setProducts([]);
    setIsStreaming(false);

    let hasLoadedAny = false;
    let totalReceived = 0;

    // Create EventSource without pagination parameters
    const url = `/api/search?q=${encodeURIComponent(query.trim())}`;
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
            const existingIds = new Set(prev.map(p => p.id));
            const newFiltered = data.products.filter(p => !existingIds.has(p.id));
            return [...prev, ...newFiltered];
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchInput);
  };

  const handleChipClick = (query) => {
    setSearchInput(query);
    performSearch(query);
  };

  const handleRetryClick = () => {
    performSearch(searchInput);
  };

  return (
    <>
      {/* Decorative Background Glows */}
      <div className="glow glow-1"></div>
      <div className="glow glow-2"></div>
      <div className="glow glow-3"></div>

      <div className="app-container">
        <header className="app-top-bar">
          <div className="logo-area">
            <span className="logo-icon">⚡</span>
            <h1 className="logo-text">Aggrify</h1>
          </div>

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
            
            {/* Welcome View */}
            {view === 'welcome' && (
              <div id="welcome-view" className="welcome-view status-view">
                <div className="icon-illustration">🛒</div>
                <h2>Ready to search?</h2>
                <p>Type any product above or click a suggestion chip. We will launch a headless Playwright browser to fetch active listings, prices, and delivery times from Blinkit.</p>
              </div>
            )}

            {/* Loading Skeleton Grid */}
            {view === 'loading' && (
              <div id="loading-view" className="loading-view">
                <div className="scraping-indicator">
                  <div className="spinner"></div>
                  <span>Running Playwright Scraper on Blinkit...</span>
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
                <p>We couldn't find any products matching your search on Blinkit. Try checking the spelling or searching for a different item.</p>
              </div>
            )}

            {/* Results View */}
            {view === 'results' && (
              <div id="results-view" className="results-view">
                <div className="results-header">
                  <span id="results-count" className="results-count">
                    {products.length} product{products.length !== 1 ? 's' : ''} found
                  </span>
                  
                  <span id="streaming-status" className={`streaming-status ${isStreaming ? '' : 'hidden'}`}>
                    <span className="small-spinner"></span>
                    Scraping live...
                  </span>

                  <span className="provider-badge">Blinkit Scraped</span>
                </div>

                <div id="products-grid" className="products-grid">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

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
    </>
  );
}

export default App;
