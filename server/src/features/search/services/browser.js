const { chromium } = require('@playwright/test');

let browser = null;
let launchPromise = null;

async function initBrowser() {
  if (browser && browser.isConnected()) return browser;
  if (launchPromise) return launchPromise;

  console.log('Launching headless browser...');
  launchPromise = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }).then(b => {
    browser = b;
    launchPromise = null;
    console.log('Browser launched successfully.');
    return browser;
  }).catch(err => {
    launchPromise = null;
    throw err;
  });

  return launchPromise;
}

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('Browser not initialized or disconnected. Initializing now...');
    await initBrowser();
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

