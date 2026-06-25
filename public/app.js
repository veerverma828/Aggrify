document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const productsGrid = document.getElementById('products-grid');
  const resultsCount = document.getElementById('results-count');
  
  // Views
  const welcomeView = document.getElementById('welcome-view');
  const loadingView = document.getElementById('loading-view');
  const errorView = document.getElementById('error-view');
  const noResultsView = document.getElementById('no-results-view');
  const resultsView = document.getElementById('results-view');
  const errorMessage = document.getElementById('error-message');
  const streamingStatus = document.getElementById('streaming-status');
  
  // Buttons
  const retryBtn = document.getElementById('retry-btn');
  const chips = document.querySelectorAll('.chip');

  // Trigger search on form submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
    }
  });

  // Trigger search on chip click
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      searchInput.value = query;
      performSearch(query);
    });
  });

  // Retry button
  retryBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
    }
  });

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

  let eventSource = null;

  // Perform search fetch request using Server-Sent Events (SSE)
  function performSearch(query) {
    if (eventSource) {
      eventSource.close();
    }

    showView(loadingView);
    productsGrid.innerHTML = '';
    resultsCount.textContent = '0 items found';
    
    let allProducts = [];
    let hasLoadedAny = false;

    const url = `/api/search?q=${encodeURIComponent(query)}`;
    eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.products && data.products.length > 0) {
          if (!hasLoadedAny) {
            hasLoadedAny = true;
            showView(resultsView);
            streamingStatus.classList.remove('hidden');
          }
          
          // Merge incoming products
          data.products.forEach(p => {
            const pPrice = parsePrice(p.price);
            
            const existing = allProducts.find(item => areProductsSame(item, p));
            if (existing) {
              existing.providers[p.provider] = {
                price: p.price,
                originalPrice: p.originalPrice,
                discount: p.discount,
                delivery: p.delivery,
                rawPrice: pPrice
              };
              if (!existing.image && p.image) {
                existing.image = p.image;
              }
            } else {
              allProducts.push({
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
              });
            }
          });

          renderResults(allProducts);
          resultsCount.textContent = `${allProducts.length} product${allProducts.length > 1 ? 's' : ''} found`;
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.addEventListener('done', () => {
      console.log('Scraping stream finished.');
      eventSource.close();
      eventSource = null;
      streamingStatus.classList.add('hidden');
      
      if (allProducts.length === 0) {
        showView(noResultsView);
      }
    });

    eventSource.addEventListener('error', (event) => {
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

      errorMessage.textContent = errorMsg;
      showView(errorView);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      streamingStatus.classList.add('hidden');
    });

    eventSource.onerror = () => {
      if (!hasLoadedAny) {
        errorMessage.textContent = 'Failed to establish connection to the scraping server.';
        showView(errorView);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        streamingStatus.classList.add('hidden');
      } else {
        console.log('Connection closed or completed.');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        streamingStatus.classList.add('hidden');
      }
    };
  }

  // Switch between views
  function showView(activeView) {
    const views = [welcomeView, loadingView, errorView, noResultsView, resultsView];
    views.forEach(view => {
      if (view === activeView) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });
  }

  // Render product results inside the grid
  function renderResults(products) {
    productsGrid.innerHTML = '';
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-id', product.id);

      const offersList = Object.entries(product.providers || {}).map(([name, info]) => ({
        name,
        ...info
      }));

      // Sort offers cheapest first
      offersList.sort((a, b) => a.rawPrice - b.rawPrice);

      const cheapestOffer = offersList[0] || {};
      const bestDiscount = (offersList.find(o => o.discount) || {}).discount;

      // Badges
      let badgeHtml = '';
      if (bestDiscount) {
        badgeHtml = `<div class="badge-container"><span class="card-badge discount-badge">${bestDiscount}</span></div>`;
      }

      // Store Badge
      let storeBadgeHtml = '';
      if (offersList.length > 1) {
        storeBadgeHtml = `<span class="store-badge provider-compared">⚡ Aggregated</span>`;
      } else {
        const storeClass = `provider-${cheapestOffer.name}`;
        const storeLabel = cheapestOffer.name === 'blinkit' ? 'Blinkit' : cheapestOffer.name === 'zepto' ? 'Zepto' : cheapestOffer.name;
        storeBadgeHtml = `<span class="store-badge ${storeClass}">${storeLabel}</span>`;
      }

      // Handle image fallback if none returned
      const imgUrl = product.image || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=300&auto=format&fit=crop&q=60';

      // Build Comparison Rows HTML
      let comparisonHtml = `<div class="comparison-container">`;
      offersList.forEach((offer, index) => {
        const isBest = index === 0 && offersList.length > 1;
        const rowClass = `comparison-row ${isBest ? 'best-price' : ''}`;
        const storeLabel = offer.name === 'blinkit' ? 'Blinkit' : offer.name === 'zepto' ? 'Zepto' : offer.name;
        
        comparisonHtml += `
          <div class="${rowClass}">
            <div class="provider-info">
              <span class="store-dot dot-${offer.name}"></span>
              <span class="provider-name">${storeLabel}</span>
            </div>
            <div class="price-details-col">
              <div class="price-info">
                ${offer.originalPrice ? `<span class="comparison-original-price">${offer.originalPrice}</span>` : ''}
                <span class="comparison-price">${offer.price || 'N/A'}</span>
              </div>
              ${offer.delivery ? `<span class="comparison-delivery">⏱️ ${offer.delivery}</span>` : ''}
            </div>
          </div>
        `;
      });
      comparisonHtml += `</div>`;

      card.innerHTML = `
        ${storeBadgeHtml}
        ${badgeHtml}
        <div class="product-img-wrapper">
          <img class="product-img" src="${imgUrl}" alt="${product.title}" loading="lazy">
        </div>
        <div class="product-details">
          <h3 class="product-title" title="${product.title}">${product.title}</h3>
          <span class="product-weight">${product.weight || '&nbsp;'}</span>
          ${comparisonHtml}
        </div>
      `;

      productsGrid.appendChild(card);
    });
  }
});
