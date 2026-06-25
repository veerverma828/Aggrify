const { getBrowser } = require('../services/browser');

async function scrapeBlinkit(query, onProducts, isCancelled) {
  const browser = getBrowser();

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
            
            return { id, title, weight, price, originalPrice, discount, image, delivery, provider: 'blinkit' };
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

module.exports = {
  scrapeBlinkit
};
