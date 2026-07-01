const express = require('express');
const router = express.Router();
const { getCachedProducts, setCachedProducts } = require('../services/cache');
const { scrapeBlinkit } = require('../scrapers/blinkitScraper');
const { scrapeZepto } = require('../scrapers/zeptoScraper');
const { scrapeInstamart } = require('../scrapers/instamartScraper');
const { LOCATIONS, DEFAULT_LOCATION } = require('../constants/locations');

router.get('/search', async (req, res) => {
  const query = req.query.q;
  const source = req.query.source || 'all'; // blinkit, zepto, instamart, all
  const locationKey = (req.query.location || 'meerut').toLowerCase().trim();
  const locationInfo = LOCATIONS[locationKey] || DEFAULT_LOCATION;
  const supportedStores = locationInfo.supportedStores || ['blinkit', 'zepto', 'instamart'];

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

  // Check if we already have these results cached (unless force refresh is requested)
  const forceRefresh = req.query.refresh === 'true';
  const cachedProducts = forceRefresh ? null : getCachedProducts(query, source, locationInfo.id);

  if (cachedProducts) {
    console.log(`Cache HIT for query "${query}" and source "${source}" location "${locationInfo.id}" (cached count: ${cachedProducts.length})`);
    res.write('data: ' + JSON.stringify({ products: cachedProducts }) + '\n\n');
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  console.log(`Cache MISS for query "${query}" and source "${source}" location "${locationInfo.id}". Running Playwright scraper(s)...`);
  
  const accumulated = [];

  // Callback to handle newly scraped products
  const onProducts = (newProducts) => {
    accumulated.push(...newProducts);
    res.write('data: ' + JSON.stringify({ products: newProducts }) + '\n\n');
  };

  // Helper to check if a store is supported at the selected location
  const isSupported = (store) => supportedStores.includes(store);

  try {
    const scrapers = [];

    if (source === 'all' || source === 'blinkit') {
      if (isSupported('blinkit')) {
        scrapers.push(
          scrapeBlinkit(query, locationInfo, onProducts, isCancelled).catch(err => {
            console.error('Blinkit scraping error:', err);
            if (source === 'blinkit') throw err;
            res.write('data: ' + JSON.stringify({ error: 'Blinkit scraper failed: ' + err.message }) + '\n\n');
          })
        );
      } else {
        res.write('data: ' + JSON.stringify({ providerStatus: { provider: 'blinkit', status: 'unsupported', location: locationInfo.name } }) + '\n\n');
      }
    }

    if (source === 'all' || source === 'zepto') {
      if (isSupported('zepto')) {
        scrapers.push(
          scrapeZepto(query, locationInfo, onProducts, isCancelled).catch(err => {
            console.error('Zepto scraping error:', err);
            if (source === 'zepto') throw err;
            res.write('data: ' + JSON.stringify({ error: 'Zepto scraper failed: ' + err.message }) + '\n\n');
          })
        );
      } else {
        res.write('data: ' + JSON.stringify({ providerStatus: { provider: 'zepto', status: 'unsupported', location: locationInfo.name } }) + '\n\n');
      }
    }

    if (source === 'all' || source === 'instamart') {
      if (isSupported('instamart')) {
        scrapers.push(
          scrapeInstamart(query, locationInfo, onProducts, isCancelled).catch(err => {
            console.error('Instamart scraping error:', err);
            if (source === 'instamart') throw err;
            res.write('data: ' + JSON.stringify({ error: 'Instamart scraper failed: ' + err.message }) + '\n\n');
          })
        );
      } else {
        res.write('data: ' + JSON.stringify({ providerStatus: { provider: 'instamart', status: 'unsupported', location: locationInfo.name } }) + '\n\n');
      }
    }

    await Promise.all(scrapers);
    
    // Cache the full scraped list (only if we actually got products)
    if (accumulated.length > 0) {
      setCachedProducts(query, source, locationInfo.id, accumulated);
      console.log(`Cached ${accumulated.length} products for query "${query}" source "${source}" location "${locationInfo.id}"`);
    }

    res.write('event: done\ndata: {}\n\n');
  } catch (error) {
    console.error('SSE Scraping Error:', error);
    res.write('event: error\ndata: ' + JSON.stringify({ error: error.message }) + '\n\n');
  } finally {
    res.end();
  }
});

module.exports = router;

