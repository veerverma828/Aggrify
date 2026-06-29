const { initBrowser, closeBrowser } = require('../server/src/features/search/services/browser');
const { scrapeBlinkit } = require('../server/src/features/search/scrapers/blinkitScraper');
const { scrapeZepto } = require('../server/src/features/search/scrapers/zeptoScraper');
const { scrapeInstamart } = require('../server/src/features/search/scrapers/instamartScraper');
const { LOCATIONS } = require('../server/src/features/search/constants/locations');

async function testAll() {
  try {
    console.log('Initializing browser...');
    await initBrowser();
    console.log('Browser initialized.');

    const query = 'milk';
    const onProducts = (products) => {
      console.log(`[ON_PRODUCTS] Received ${products.length} products from ${products[0]?.provider}`);
      console.log('Sample:', products[0]);
    };
    const isCancelled = () => false;

    console.log('\n--- Testing Blinkit ---');
    try {
      await scrapeBlinkit(query, onProducts, isCancelled);
    } catch (e) {
      console.error('Blinkit failed:', e);
    }

    console.log('\n--- Testing Zepto ---');
    try {
      await scrapeZepto(query, onProducts, isCancelled);
    } catch (e) {
      console.error('Zepto failed:', e);
    }

    console.log('\n--- Testing Instamart ---');
    try {
      const locationInfo = LOCATIONS['meerut'];
      await scrapeInstamart(query, locationInfo, onProducts, isCancelled);
    } catch (e) {
      console.error('Instamart failed:', e);
    }

  } catch (err) {
    console.error('Error in testAll:', err);
  } finally {
    console.log('Closing browser...');
    await closeBrowser();
    console.log('Done.');
  }
}

testAll();
