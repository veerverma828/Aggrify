const express = require('express');
const path = require('path');
const { chromium } = require('@playwright/test');

const app = express();
const PORT = process.env.PORT || 5000;

// Search Cache configuration (In-Memory Cache with a 5-minute TTL)
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProducts(query) {
  const key = query.toLowerCase().trim();
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return cached.products;
}

function setCachedProducts(query, products) {
  const key = query.toLowerCase().trim();
  searchCache.set(key, {
    products,
    timestamp: Date.now()
  });
}

// Serve static files from the 'frontend/dist' directory (for production)
app.use(express.static(path.join(__dirname, 'frontend/dist')));

let browser;

// Launch browser once on startup to speed up requests
async function initBrowser() {
  console.log('Launching headless browser...');
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Browser launched successfully.');
}

// Scrape products from Blinkit
async function scrapeBlinkit(query, onProducts, isCancelled) {
  if (!browser) {
    throw new Error('Browser is not initialized yet');
  }

  // Create a clean context for each search to avoid session cross-pollution
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  // Speed Optimizations: Block heavy assets & tracking scripts
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    if (
      ['font', 'media'].includes(type) ||
      url.includes('analytics') ||
      url.includes('doubleclick') ||
      url.includes('facebook') ||
      url.includes('google-analytics') ||
      url.includes('mixpanel')
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  try {
    const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(query)}`;
    console.log(`Scraping URL: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for either product cards to load OR a "No results" indicator
    try {
      await page.waitForSelector('div[role="button"][id]', { timeout: 8000 });
    } catch (e) {
      console.log('Product elements not found within timeout (might be no results).');
      return;
    }

    const sentIds = new Set();
    const pendingProducts = new Map();

    const extractAndEmit = async (isFinal = false) => {
      const currentProducts = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div[role="button"][id]'));
        
        return cards
          .filter(card => {
            const id = card.getAttribute('id');
            // Filter out header cards (like product_container)
            return id && !isNaN(Number(id));
          })
          .map(card => {
            const id = card.getAttribute('id');
            
            // Image
            const imgEl = card.querySelector('img[src*="/product/"]') || card.querySelector('img[src*="cms-assets"]') || card.querySelector('img');
            let image = '';
            if (imgEl) {
              image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
              // Handle base64 placeholder fallback to srcset
              if (image.startsWith('data:') && imgEl.getAttribute('srcset')) {
                const firstSrc = imgEl.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
                if (firstSrc) image = firstSrc;
              }
            }
            
            // Delivery Time
            const deliveryEl = Array.from(card.querySelectorAll('div')).find(d => /^\d+\s*min/i.test(d.innerText.trim()));
            const delivery = deliveryEl ? deliveryEl.innerText.trim().split('\n')[0] : '';
            
            // Title
            const titleEl = card.querySelector('.tw-line-clamp-2');
            const title = titleEl ? titleEl.innerText.trim() : '';
            
            // Weight/Quantity
            const weightEl = card.querySelector('.tw-line-clamp-1');
            const weight = weightEl ? weightEl.innerText.trim() : '';
            
            // Prices
            const divs = Array.from(card.querySelectorAll('div'));
            const priceDivs = divs.filter(d => {
              const text = d.innerText.trim();
              return text.startsWith('₹') && !d.querySelector('div');
            });
            
            const price = priceDivs[0] ? priceDivs[0].innerText.trim() : '';
            const originalPrice = priceDivs[1] ? priceDivs[1].innerText.trim() : '';
            
            // Discount
            const discountEl = Array.from(card.querySelectorAll('div')).find(d => d.innerText.includes('% OFF'));
            const discount = discountEl ? discountEl.innerText.trim().replace('\n', ' ') : '';
            
            return { id, title, weight, price, originalPrice, discount, image, delivery };
          });
      });

      const toEmit = [];

      for (const p of currentProducts) {
        if (sentIds.has(p.id)) {
          continue;
        }

        const hasValidImage = p.image && !p.image.startsWith('data:') && !p.image.includes('placeholder') && p.image !== '';

        if (hasValidImage) {
          // Remove from pending if it loaded its image
          pendingProducts.delete(p.id);
          sentIds.add(p.id);
          
          toEmit.push(p);
        } else {
          // Keep in pending queue (wait for image to lazy load on next scrolls)
          pendingProducts.set(p.id, p);
        }
      }

      // Flush remaining pending products if this is the final check
      if (isFinal) {
        for (const [id, p] of pendingProducts.entries()) {
          sentIds.add(id);
          toEmit.push(p);
        }
        pendingProducts.clear();
      }

      if (toEmit.length > 0) {
        onProducts(toEmit);
      }
    };

    // Emit initial load results
    await extractAndEmit();

    // Scroll down incrementally to trigger lazy loading of images for all products
    let scrollAttempts = 0;
    const maxScrollAttempts = 80; // Increased to scan longer pages fully
    
    while (scrollAttempts < maxScrollAttempts) {
      if (isCancelled()) {
        console.log('Scraping cancelled: Client disconnected.');
        break;
      }

      // Scroll down by 800px to trigger lazy loading of images incrementally
      await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));
      
      // Wait for image lazy loading and rendering (300ms is a safe & fast value)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Emit newly visible results (deferring lazy ones)
      await extractAndEmit();

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      const scrollY = await page.evaluate(() => window.scrollY);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      // Check if we've reached near the bottom of the page
      if (scrollY + viewportHeight >= newHeight - 150) {
        // We are near the bottom. Wait 1200ms to allow slow networks to load more products
        await new Promise(resolve => setTimeout(resolve, 1200));
        await extractAndEmit(); // Extract any newly appended elements
        
        const finalHeight = await page.evaluate(() => document.body.scrollHeight);
        if (finalHeight <= newHeight) {
          break; // Truly reached the bottom of the page
        }
      }
      scrollAttempts++;
    }

    // Flush any products that still don't have images at the end
    await extractAndEmit(true);
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await context.close(); // Automatically closes pages under this context
  }
}

// Search API Endpoint (using Server-Sent Events)
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let cancelled = false;
  req.on('close', () => {
    cancelled = true;
  });

  const isCancelled = () => cancelled;

  // Check if we already have these results cached
  const cachedProducts = getCachedProducts(query);

  if (cachedProducts) {
    console.log(`Cache HIT for query "${query}" (cached count: ${cachedProducts.length})`);
    res.write('data: ' + JSON.stringify({ products: cachedProducts }) + '\n\n');
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  console.log(`Cache MISS for query "${query}". Running Playwright scraper...`);
  
  const accumulated = [];

  // Callback to handle newly scraped products
  const onProducts = (newProducts) => {
    accumulated.push(...newProducts);
    res.write('data: ' + JSON.stringify({ products: newProducts }) + '\n\n');
  };

  try {
    await scrapeBlinkit(query, onProducts, isCancelled);
    
    // Cache the full scraped list (only if we actually got products)
    if (accumulated.length > 0) {
      setCachedProducts(query, accumulated);
      console.log(`Cached ${accumulated.length} products for query "${query}"`);
    }

    res.write('event: done\ndata: {}\n\n');
  } catch (error) {
    console.error('SSE Scraping Error:', error);
    res.write('event: error\ndata: ' + JSON.stringify({ error: error.message }) + '\n\n');
  } finally {
    res.end();
  }
});

// Fallback for single page application (SPA) routing in production
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Start Server
initBrowser().then(() => {
  app.listen(PORT, () => {
    console.log('Server is running at http://localhost:' + PORT);
  });
}).catch(err => {
  console.error('Failed to start server due to browser initialization failure:', err);
  process.exit(1);
});

// Clean up browser on exit
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('Shutting down server...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
