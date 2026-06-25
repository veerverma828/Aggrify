const { chromium } = require('@playwright/test');

async function testZepto() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to Zepto...');
    await page.goto('https://www.zepto.com', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Clicking "Select Location" button...');
    const locationBtn = page.locator('button:has-text("Select Location")').first();
    await locationBtn.click();
    await page.waitForTimeout(2000); // wait for modal transition

    console.log('Looking for search address input...');
    const addressInput = page.locator('input[placeholder*="Search"], input[placeholder*="address"], input[type="text"]').first();
    await addressInput.click();
    await addressInput.fill('Indiranagar, Bengaluru');
    console.log('Typed address. Waiting for suggestions...');
    await page.waitForTimeout(3000); // wait for autocomplete suggestions to load

    console.log('Clicking the first suggestion...');
    const firstSuggestion = page.locator('span.line-clamp-2.break-all').first();
    await firstSuggestion.click();
    console.log('Clicked suggestion. Waiting for page to reload/redirect...');
    await page.waitForTimeout(5000); // wait for cookies/storage and page refresh

    // Navigating to search URL
    console.log('Navigating to search page for milk...');
    await page.goto('https://www.zepto.com/search?query=milk', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Let's scrape product cards
    console.log('Checking for product cards...');
    // The browser subagent mentioned: `a[href^="/pn/"]` or `a.B4vNQ`
    const cards = await page.locator('a[href^="/pn/"]').all();
    console.log(`Found ${cards.length} product cards.`);

    const products = [];
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      const card = cards[i];
      
      const productData = await card.evaluate((el) => {
        // Selector details from subagent:
        // - Title: text content excluding prices, quantity, ratings. Or first h5/div.
        // Let's see what children it has
        // We can just capture the full text first
        const fullText = el.innerText.trim();
        
        // Find image
        const img = el.querySelector('img');
        const image = img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '';
        
        return { fullText, image };
      });
      
      products.push(productData);
    }

    console.log('Scraped products (raw text and images):', JSON.stringify(products, null, 2));

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testZepto();
