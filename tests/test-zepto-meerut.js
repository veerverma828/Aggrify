const { chromium } = require('@playwright/test');

async function testZeptoMeerut() {
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
    await page.waitForTimeout(2000);

    console.log('Looking for search address input...');
    const addressInput = page.locator('input[placeholder*="Search"], input[placeholder*="address"], input[type="text"]').first();
    await addressInput.click();
    await addressInput.fill('Meerut Cantt, Meerut');
    console.log('Typed address. Waiting for suggestions...');
    await page.waitForTimeout(3000);

    const firstSuggestion = page.locator('span.line-clamp-2.break-all').first();
    await firstSuggestion.click();
    await page.waitForTimeout(5000);

    console.log('Navigating to search page for milk...');
    await page.goto('https://www.zepto.com/search?query=milk', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Current URL:', page.url());
    const cards = await page.locator('a[href^="/pn/"]').all();
    console.log(`Found ${cards.length} product cards.`);

    // If zero cards, let's log the body text or screenshot or message
    if (cards.length === 0) {
      const text = await page.locator('body').innerText();
      console.log('Page body snippet:', text.substring(0, 1000));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testZeptoMeerut();
