const { chromium } = require('@playwright/test');

let browser = null;

async function initBrowser() {
  if (browser) return browser;
  console.log('Launching headless browser...');
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Browser launched successfully.');
  return browser;
}

function getBrowser() {
  if (!browser) {
    throw new Error('Browser is not initialized yet');
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    console.log('Closing browser...');
    await browser.close();
    browser = null;
  }
}

module.exports = {
  initBrowser,
  getBrowser,
  closeBrowser
};
