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
          appendResults(data.products);
          allProducts = allProducts.concat(data.products);
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

  // Append product results inside the grid dynamically
  function appendResults(products) {
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-id', product.id);

      // Create Badge Container for Delivery Time and Discounts
      let badgeHtml = '';
      if (product.discount || product.delivery) {
        badgeHtml = `<div class="badge-container">`;
        if (product.discount) {
          badgeHtml += `<span class="card-badge discount-badge">${product.discount}</span>`;
        }
        if (product.delivery) {
          badgeHtml += `
            <span class="card-badge delivery-badge">
              ⏱️ ${product.delivery}
            </span>`;
        }
        badgeHtml += `</div>`;
      }

      // Handle image fallback if none returned
      const imgUrl = product.image || 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=300&auto=format&fit=crop&q=60';

      card.innerHTML = `
        ${badgeHtml}
        <div class="product-img-wrapper">
          <img class="product-img" src="${imgUrl}" alt="${product.title}" loading="lazy">
        </div>
        <div class="product-details">
          <h3 class="product-title" title="${product.title}">${product.title}</h3>
          <span class="product-weight">${product.weight || '&nbsp;'}</span>
          <div class="product-price-row">
            <span class="current-price">${product.price || 'N/A'}</span>
            ${product.originalPrice ? `<span class="original-price">${product.originalPrice}</span>` : ''}
          </div>
        </div>
      `;

      productsGrid.appendChild(card);
    });
  }
});
