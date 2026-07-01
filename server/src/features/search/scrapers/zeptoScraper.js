const { getBrowser } = require('../services/browser');

// Per-location storage state cache
const zeptoStorageStates = new Map();

async function scrapeZepto(query, locationInfo, onProducts, isCancelled) {
  const browser = await getBrowser();
  const locationId = locationInfo.id || 'bengaluru';
  const locationAddress = locationInfo.locality
    ? `${locationInfo.locality}, ${locationInfo.city}`
    : locationInfo.city || 'Bengaluru';

  // Create context (with storage state cache per location if available)
  const contextOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: parseFloat(locationInfo.lat), longitude: parseFloat(locationInfo.lng) },
    permissions: ['geolocation'],
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  };

  const cachedState = zeptoStorageStates.get(locationId);
  if (cachedState) {
    contextOptions.storageState = cachedState;
  }

  const context = await browser.newContext(contextOptions);
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
    // If no cached storage state for this location, run the location selection flow
    if (!cachedState) {
      console.log(`[Zepto Scraper] No storage state cached for location "${locationId}". Performing location selection...`);
      await page.goto('https://www.zepto.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const locationBtn = page.locator('button:has-text("Select Location")').first();
      await locationBtn.click();
      await page.waitForTimeout(2000); // wait for modal transition

      const addressInput = page.locator('input[placeholder*="Search"], input[placeholder*="address"], input[type="text"]').first();
      await addressInput.click();
      await addressInput.fill(locationAddress);
      await page.waitForTimeout(3000); // wait for autocomplete

      const firstSuggestion = page.locator('span.line-clamp-2.break-all').first();
      await firstSuggestion.click();
      await page.waitForTimeout(5000); // wait for redirect and cookie write

      // Save state for this location for future searches
      const newState = await context.storageState();
      zeptoStorageStates.set(locationId, newState);
      console.log(`[Zepto Scraper] Saved storage state for location "${locationId}".`);
    }

    const searchUrl = `https://www.zepto.com/search?query=${encodeURIComponent(query)}`;
    console.log(`[Zepto Scraper] Scraping URL: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for product cards
    try {
      await page.waitForSelector('a[href^="/pn/"]', { timeout: 8000 });
    } catch (e) {
      console.log('[Zepto Scraper] Product elements not found within timeout.');
      return;
    }

    const sentIds = new Set();
    const pendingProducts = new Map();

    const extractAndEmit = async (isFinal = false) => {
      const currentProducts = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href^="/pn/"]'));
        
        return cards.map(card => {
          // 1. Image
          const imgEl = card.querySelector('img');
          let image = '';
          if (imgEl) {
            image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
            // handle lazy placeholder src attribute
            if (image.startsWith('data:') && imgEl.getAttribute('srcset')) {
              const firstSrc = imgEl.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
              if (firstSrc) image = firstSrc;
            }
          }

          // 2. Title
          let title = '';
          const titleEl = card.querySelector('[data-slot-id="ProductName"]') || card.querySelector('h5');
          if (titleEl) {
            title = titleEl.innerText.trim();
          } else {
            title = card.innerText.split('\n')[0] || '';
          }

          // 3. Weight
          let weight = '';
          const weightEl = card.querySelector('[data-slot-id="PackSize"]') || card.querySelector('span.text-neutral-500, span.text-gray-500');
          if (weightEl) {
            weight = weightEl.innerText.trim();
          } else {
            const fallbackWeightEl = Array.from(card.querySelectorAll('span, div')).find(el => {
              const text = el.innerText.trim();
              return el.children.length === 0 && /^\d+\s*(ml|l|g|kg|pcs|pack|packet|units)/i.test(text);
            });
            weight = fallbackWeightEl ? fallbackWeightEl.innerText.trim() : '';
          }

          // 4. Prices
          let price = '';
          let originalPrice = '';
          const priceContainer = card.querySelector('[data-slot-id="EdlpPrice"]');
          if (priceContainer) {
            const spans = Array.from(priceContainer.querySelectorAll('span'));
            price = spans[0] ? spans[0].innerText.trim() : '';
            originalPrice = spans[1] ? spans[1].innerText.trim() : '';
          } else {
            const priceSpans = Array.from(card.querySelectorAll('span, div')).filter(el => {
              const text = el.innerText.trim();
              return el.children.length === 0 && text.startsWith('₹');
            });
            price = priceSpans[0] ? priceSpans[0].innerText.trim() : '';
            originalPrice = priceSpans[1] ? priceSpans[1].innerText.trim() : '';
          }

          // 5. Discount
          let discount = '';
          const discountEl = Array.from(card.querySelectorAll('span, div')).find(el => {
            const text = el.innerText.trim();
            return el.children.length === 0 && (text.includes('OFF') || text.includes('%'));
          });
          if (discountEl) {
            const parentText = discountEl.parentElement ? discountEl.parentElement.innerText.trim().replace(/\n/g, ' ') : '';
            if (parentText && (parentText.includes('₹') || parentText.includes('%'))) {
              discount = parentText;
            } else {
              discount = discountEl.innerText.trim();
            }
          }

          // ID derivation
          const href = card.getAttribute('href') || '';
          const idMatch = href.match(/\/pjid\/([^/]+)/) || href.match(/\/pn\/([^/]+)/);
          const id = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);

          return { id, title, weight, price, originalPrice, discount, image, delivery: '', provider: 'zepto' };
        });
      });

      const toEmit = [];

      for (const p of currentProducts) {
        if (sentIds.has(p.id)) {
          continue;
        }

        const hasValidImage = p.image && !p.image.startsWith('data:') && !p.image.includes('placeholder') && p.image !== '';

        if (hasValidImage) {
          pendingProducts.delete(p.id);
          sentIds.add(p.id);
          toEmit.push(p);
        } else {
          pendingProducts.set(p.id, p);
        }
      }

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

    // Emit initial
    await extractAndEmit();

    // Scroll loop
    let scrollAttempts = 0;
    const maxScrollAttempts = 40;
    while (scrollAttempts < maxScrollAttempts) {
      if (isCancelled()) {
        console.log('[Zepto Scraper] Scraping cancelled: Client disconnected.');
        break;
      }

      await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));
      await new Promise(resolve => setTimeout(resolve, 300));
      await extractAndEmit();

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      const scrollY = await page.evaluate(() => window.scrollY);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      if (scrollY + viewportHeight >= newHeight - 150) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await extractAndEmit();
        const finalHeight = await page.evaluate(() => document.body.scrollHeight);
        if (finalHeight <= newHeight) {
          break;
        }
      }
      scrollAttempts++;
    }

    await extractAndEmit(true);
  } catch (error) {
    console.error('[Zepto Scraper] Error during scraping:', error);
    // If it fails due to location selection state, clear storage state for this location so we retry clean
    zeptoStorageStates.delete(locationId);
    throw error;
  } finally {
    await context.close();
  }
}

module.exports = {
  scrapeZepto
};

