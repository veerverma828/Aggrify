const { getBrowser } = require('../services/browser');

const instamartStorageStates = new Map();
let cachedProxy = null;
let proxyDiscoveryPromise = null;
let lastProxyFetchTime = 0;

async function fetchProxies() {
  console.log('[Instamart Scraper] Fetching fresh Indian proxies (HTTP/SOCKS4/SOCKS5) from multiple sources...');
  const proxies = [];
  
  // 1. Fetch from monosans GitHub proxy-list (highly reliable, updated hourly)
  try {
    const res = await fetch('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/in.txt');
    if (res.ok) {
      const text = await res.text();
      const list = text.split('\n').map(p => p.trim()).filter(Boolean);
      list.forEach(p => {
        // monosans list has format host:port
        // We add them as HTTP proxies by default, which is the most compatible with Playwright
        proxies.push({ type: 'http', server: `http://${p}` });
      });
      console.log(`[Instamart Scraper] Fetched ${list.length} proxies from monosans/proxy-list (India).`);
    }
  } catch (err) {
    console.warn('[Instamart Scraper] Failed to fetch proxies from monosans/proxy-list:', err.message);
  }

  // 2. Fetch SOCKS5 from monosans GitHub proxy-list (highly reliable)
  try {
    const res = await fetch('https://raw.githubusercontent.com/monosans/proxy-list/main/proxies_socks5/in.txt');
    if (res.ok) {
      const text = await res.text();
      const list = text.split('\n').map(p => p.trim()).filter(Boolean);
      list.forEach(p => {
        proxies.push({ type: 'socks5', server: `socks5://${p}` });
      });
      console.log(`[Instamart Scraper] Fetched ${list.length} SOCKS5 proxies from monosans/proxy-list (India).`);
    }
  } catch (err) {
    console.warn('[Instamart Scraper] Failed to fetch SOCKS5 proxies from monosans/proxy-list:', err.message);
  }

  // 3. Fetch HTTP Proxies from ProxyScrape
  try {
    const res = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=4000&country=IN&ssl=all&anonymity=all');
    if (res.ok) {
      const text = await res.text();
      const list = text.split('\n').map(p => p.trim()).filter(Boolean);
      list.forEach(p => proxies.push({ type: 'http', server: `http://${p}` }));
      console.log(`[Instamart Scraper] Fetched ${list.length} HTTP proxies from ProxyScrape.`);
    }
  } catch (err) {
    console.warn('[Instamart Scraper] Failed to fetch HTTP proxies from ProxyScrape:', err.message);
  }

  // 4. Fetch SOCKS5 Proxies from ProxyScrape
  try {
    const res = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=4000&country=IN');
    if (res.ok) {
      const text = await res.text();
      const list = text.split('\n').map(p => p.trim()).filter(Boolean);
      list.forEach(p => proxies.push({ type: 'socks5', server: `socks5://${p}` }));
      console.log(`[Instamart Scraper] Fetched ${list.length} SOCKS5 proxies from ProxyScrape.`);
    }
  } catch (err) {
    console.warn('[Instamart Scraper] Failed to fetch SOCKS5 proxies from ProxyScrape:', err.message);
  }

  // 5. Fetch SOCKS4 Proxies from ProxyScrape
  try {
    const res = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=4000&country=IN');
    if (res.ok) {
      const text = await res.text();
      const list = text.split('\n').map(p => p.trim()).filter(Boolean);
      list.forEach(p => proxies.push({ type: 'socks4', server: `socks4://${p}` }));
      console.log(`[Instamart Scraper] Fetched ${list.length} SOCKS4 proxies from ProxyScrape.`);
    }
  } catch (err) {
    console.warn('[Instamart Scraper] Failed to fetch SOCKS4 proxies from ProxyScrape:', err.message);
  }

  // Deduplicate servers to keep list clean
  const uniqueServers = new Map();
  proxies.forEach(p => {
    if (!uniqueServers.has(p.server)) {
      uniqueServers.set(p.server, p);
    }
  });

  return Array.from(uniqueServers.values());
}

async function getWorkingProxy(browser) {
  if (cachedProxy) {
    console.log(`[Instamart Scraper] Using cached proxy: ${cachedProxy}`);
    return cachedProxy;
  }

  if (proxyDiscoveryPromise) {
    console.log('[Instamart Scraper] Proxy discovery already in progress. Waiting...');
    return await proxyDiscoveryPromise;
  }

  proxyDiscoveryPromise = (async () => {
    try {
      const now = Date.now();
      if (now - lastProxyFetchTime < 15000) {
        console.log('[Instamart Scraper] Rate-limiting proxy fetch. Waiting before next attempt.');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      lastProxyFetchTime = now;

      const proxiesList = await fetchProxies();
      if (proxiesList.length === 0) {
        console.error('[Instamart Scraper] No proxies available. Falling back to direct connection.');
        return 'direct';
      }

      const testProxy = async (proxy) => {
        let testContext = null;
        try {
          testContext = await browser.newContext({
            proxy: { server: proxy.server },
            ignoreHTTPSErrors: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 },
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata'
          });

          // Inject complete stealth evasions to proxy validation context
          await testContext.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = {
              app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
              runtime: {}
            };
            Object.defineProperty(navigator, 'plugins', { get: () => [{ description: 'Portable Document Format', filename: 'internal-pdf-viewer', name: 'Chromium PDF Reader' }] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-GB', 'en-US', 'en'] });
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
              if (parameter === 37445) return 'Intel Inc.';
              if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640';
              return getParameter.apply(this, arguments);
            };
          });

          const testPage = await testContext.newPage();
          
          const testUrl = 'https://api.ipify.org?format=json';
          const response = await testPage.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 6000 });
          
          const status = response ? response.status() : 0;
          if (status === 200) {
            console.log(`[Instamart Scraper] 🎉 Proxy ${proxy.server} successfully validated!`);
            return proxy.server;
          } else {
            throw new Error(`Failed validation: status=${status}`);
          }
        } catch (err) {
          throw err;
        } finally {
          if (testContext) {
            await testContext.close().catch(() => {});
          }
        }
      };

      const firstSuccessful = async (promises) => {
        return new Promise((resolve, reject) => {
          let rejectedCount = 0;
          let resolved = false;
          
          promises.forEach(p => {
            p.then(val => {
              if (!resolved) {
                resolved = true;
                resolve(val);
              }
            }).catch(() => {
              rejectedCount++;
              if (rejectedCount === promises.length && !resolved) {
                reject(new Error('All proxies failed.'));
              }
            });
          });
        });
      };

      // Test up to 30 proxies concurrently in batches of 10 to be efficient and fast
      const batchSize = 10;
      const listToTest = proxiesList.slice(0, 30);
      for (let i = 0; i < listToTest.length; i += batchSize) {
        const toTest = listToTest.slice(i, i + batchSize);
        console.log(`[Instamart Scraper] Testing batch of ${toTest.length} proxies concurrently against Swiggy...`);
        try {
          const workingProxy = await firstSuccessful(toTest.map(p => testProxy(p)));
          cachedProxy = workingProxy;
          return workingProxy;
        } catch (err) {
          // Batch failed, move to next
        }
      }

      console.log('[Instamart Scraper] All proxies failed Swiggy validation. Falling back to direct connection.');
      return 'direct';
    } finally {
      proxyDiscoveryPromise = null;
    }
  })();

  return await proxyDiscoveryPromise;
}

function getRandomSessionOptions() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  ];
  const agent = userAgents[Math.floor(Math.random() * userAgents.length)];
  const width = 1280 + Math.floor(Math.random() * 200);
  const height = 800 + Math.floor(Math.random() * 150);
  return { userAgent: agent, viewport: { width, height } };
}

async function scrapeInstamartInternal(query, locationInfo, onProducts, isCancelled) {
  const browser = await getBrowser();
  const locationId = locationInfo.id || 'meerut';

  // Find a working proxy dynamically to bypass geo-blocking and AWS WAF
  const proxyServer = await getWorkingProxy(browser);

  const session = getRandomSessionOptions();

  // Create context with proxy, permissions, and set geolocation coordinates
  const contextOptions = {
    ignoreHTTPSErrors: true,
    userAgent: session.userAgent,
    viewport: session.viewport,
    geolocation: { latitude: parseFloat(locationInfo.lat), longitude: parseFloat(locationInfo.lng) },
    permissions: ['geolocation'],
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  };
  
  if (proxyServer && proxyServer !== 'direct') {
    contextOptions.proxy = { server: proxyServer };
    console.log(`[Instamart Scraper] Starting context with proxy: ${proxyServer}`);
  } else {
    console.log('[Instamart Scraper] Starting context with direct connection (no proxy)');
  }
  
  const currentStorageState = instamartStorageStates.get(locationId);
  if (currentStorageState) {
    contextOptions.storageState = currentStorageState;
  }

  const context = await browser.newContext(contextOptions);
  
  // Construct and pre-set location cookies including the vital userLocation cookie
  const userLocationObj = {
    lat: parseFloat(locationInfo.lat),
    lng: parseFloat(locationInfo.lng),
    address: locationInfo.address || `${locationInfo.locality || ''}, ${locationInfo.city || ''}, India`,
    id: '',
    annotation: locationInfo.address || `${locationInfo.locality || ''}, ${locationInfo.city || ''}, India`,
    name: ''
  };
  const userLocationValue = encodeURIComponent(JSON.stringify(userLocationObj));

  const initialCookies = [];
  const domains = ['.swiggy.com', 'www.swiggy.com'];

  for (const domain of domains) {
    initialCookies.push(
      { name: 'userLocation', value: userLocationValue, domain, path: '/' },
      { name: 'latitude', value: String(locationInfo.lat), domain, path: '/' },
      { name: 'longitude', value: String(locationInfo.lng), domain, path: '/' },
      { name: 'lat', value: String(locationInfo.lat), domain, path: '/' },
      { name: 'lng', value: String(locationInfo.lng), domain, path: '/' },
      { name: 'pincode', value: String(locationInfo.pincode), domain, path: '/' },
      { name: 'locality', value: String(locationInfo.locality), domain, path: '/' },
      { name: 'city', value: String(locationInfo.city), domain, path: '/' },
      { name: 'address', value: String(locationInfo.address), domain, path: '/' },
      { name: '_address', value: String(locationInfo.address), domain, path: '/' },
      { name: '_lat', value: String(locationInfo.lat), domain, path: '/' },
      { name: '_lng', value: String(locationInfo.lng), domain, path: '/' }
    );
  }

  try {
    await context.addCookies(initialCookies);
    console.log('[Instamart Scraper] Pre-set Swiggy location and session cookies successfully.');
  } catch (cookieErr) {
    console.warn('[Instamart Scraper] Failed to pre-set Swiggy cookies:', cookieErr.message);
  }

  // Evasion: Override navigator.webdriver and other fingerprints at context level to survive reloads
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    window.chrome = {
      app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
      runtime: {}
    };
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { description: 'Portable Document Format', filename: 'internal-pdf-viewer', name: 'Chromium PDF Plugin' },
        { description: 'Portable Document Format', filename: 'internal-pdf-viewer', name: 'Chromium PDF Viewer' }
      ]
    });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-IN', 'en-GB', 'en-US', 'en']
    });
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640';
      return getParameter.apply(this, arguments);
    };
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
    // 1. Go to the instamart home page
    console.log('[Instamart Scraper] Loading Instamart Home Page...');
    try {
      const response = await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'domcontentloaded', timeout: 25000 });
      const status = response ? response.status() : 200;
      
      // AWS WAF Auto-Solve Waiting Loop
      if (status === 202 || (await page.content()).includes('awswaf')) {
        console.log('[Instamart Scraper] AWS WAF challenge detected. Waiting up to 10s for auto-solve and reload...');
        let cleared = false;
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(1000);
          const title = await page.title();
          if (title && title.includes('Instamart')) {
            console.log('[Instamart Scraper] AWS WAF cleared successfully. Page title:', title);
            cleared = true;
            break;
          }
        }
        if (cleared) {
          console.log('[Instamart Scraper] Waiting 4 seconds for page elements to hydrate...');
          await page.waitForTimeout(4000);
        }
      } else {
        // General brief wait for scripts to initialize
        await page.waitForTimeout(3000);
      }
    } catch (err) {
      console.warn('[Instamart Scraper] Failed to load Swiggy Instamart home page directly, trying fallback soon...', err.message);
    }

    // 2. Perform location selection if no cached storage state
    if (!currentStorageState) {
      console.log(`[Instamart Scraper] No storage state cached for location "${locationId}". Performing location selection...`);
      try {
        // Inject localStorage keys as secondary safeguard
        await page.evaluate((loc) => {
          try {
            const addressObj = {
              address: loc.address,
              locality: loc.locality,
              city: loc.city,
              pincode: loc.pincode,
              lat: parseFloat(loc.lat),
              lng: parseFloat(loc.lng)
            };
            localStorage.setItem('userAddress', JSON.stringify(addressObj));
            localStorage.setItem('location', JSON.stringify({
              lat: parseFloat(loc.lat),
              lng: parseFloat(loc.lng),
              address: loc.address
            }));
            localStorage.setItem('user_lat', loc.lat);
            localStorage.setItem('user_lng', loc.lng);
            localStorage.setItem('latitude', loc.lat);
            localStorage.setItem('longitude', loc.lng);
            localStorage.setItem('pincode', loc.pincode);
            localStorage.setItem('locality', loc.locality);
            localStorage.setItem('city', loc.city);
          } catch (e) {
            console.error('Failed to set localStorage', e);
          }
        }, locationInfo).catch(() => {});

        // Perform JS evaluation click on "Use current location"
        console.log('[Instamart Scraper] Running JS evaluation click on "Use current location" button...');
        const clicked = await page.evaluate(() => {
          let btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText && el.innerText.includes('Use current location'));
          if (!btn) {
            btn = Array.from(document.querySelectorAll('div, span')).find(el => el.innerText && el.innerText.trim() === 'Use current location');
          }
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          console.log('[Instamart Scraper] JS click succeeded. Waiting 6 seconds for location determination...');
          await page.waitForTimeout(6000);
        } else {
          console.log('[Instamart Scraper] "Use current location" button not found. Using cookie-based fallback.');
        }

        const savedState = await context.storageState();
        instamartStorageStates.set(locationId, savedState);
        console.log(`[Instamart Scraper] Saved storage state successfully for location "${locationId}".`);
      } catch (err) {
        console.error('[Instamart Scraper] Location selection flow failed:', err.message);
      }
    }

    // 3. Perform the search
    let searchCompleted = false;

    // A. Let's first try direct search URL navigation as the fastest route!
    const searchUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
    console.log(`[Instamart Scraper] Trying direct navigation to search URL: ${searchUrl}`);
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);

      // Check if we are still on the search page or if we were redirected to home page
      const currentUrl = page.url();
      if (!currentUrl.includes('/search')) {
        console.log(`[Instamart Scraper] Redirected away from search page to: ${currentUrl}. Will use home-page search flow.`);
      } else {
        // We are on the search page. Let's check if products are already visible!
        const productsCount = await page.evaluate(() => {
          const itemCards = document.querySelectorAll('[data-testid="item-card"], [data-testid="product-card"], [class*="itemCard"], [class*="ItemCard"], [class*="productCard"], [class*="ProductCard"]');
          return itemCards.length;
        });

        if (productsCount > 0) {
          console.log(`[Instamart Scraper] Direct navigation search succeeded! Found ${productsCount} products immediately.`);
          searchCompleted = true;
        } else {
          console.log('[Instamart Scraper] Direct navigation loaded the search page, but no products are visible yet. Attempting interactive search on this page...');
          // Locate search input and submit query manually
          const searchInputSelector = 'input[data-testid="search-page-header-search-bar-input"], input[data-testid="search-input"], input[class*="SearchInput"], input[name="query"], input[placeholder*="Search for"], input[placeholder*="item"], input[type="search"]';
          const searchInput = page.locator(searchInputSelector).first();
          if (await searchInput.isVisible({ timeout: 4005 })) {
            console.log(`[Instamart Scraper] Typing query "${query}" into the visible search input...`);
            await searchInput.click();
            // Clear and press sequential keys
            await searchInput.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            try {
              await searchInput.pressSequentially(query, { delay: 120 });
            } catch (err) {
              console.warn('[Instamart Scraper] pressSequentially failed, using fill fallback:', err.message);
              await searchInput.fill(query);
            }
            await page.waitForTimeout(1500); // Wait for suggestions

            // Click the first suggestion or press Enter
            const clickedSuggestion = await page.evaluate((q) => {
              let els = Array.from(document.querySelectorAll('[role="option"], .suggestion-item, .autocomplete-item, [class*="suggestion" i], [class*="Suggestion" i]'));
              if (els.length === 0) {
                els = Array.from(document.querySelectorAll('div, span, p, li, button, a'));
              }
              const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
              const suggestion = els.find(el => {
                const tagName = el.tagName.toUpperCase();
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'SVG', 'PATH'].includes(tagName)) return false;

                const text = (el.innerText || '').trim();
                if (!text || text.length > 100 || el.children.length > 0) return false;

                const lowerText = text.toLowerCase();
                if (
                  lowerText === 'add' ||
                  lowerText === 'search' ||
                  lowerText === 'clear' ||
                  lowerText.includes('recent') ||
                  lowerText.includes('window.___') ||
                  lowerText.includes('initial_state') ||
                  lowerText.includes('function') ||
                  lowerText.includes('{') ||
                  lowerText.includes('}') ||
                  lowerText.includes('const ')
                ) {
                  return false;
                }

                if (keywords.length === 0) {
                  return lowerText.includes(q.toLowerCase());
                }
                return keywords.some(kw => lowerText.includes(kw));
              });
              if (suggestion) {
                suggestion.click();
                return { success: true, text: suggestion.innerText };
              }
              return { success: false };
            }, query);

            if (clickedSuggestion.success) {
              console.log(`[Instamart Scraper] Clicked autocomplete suggestion: "${clickedSuggestion.text}"`);
            } else {
              console.log('[Instamart Scraper] No autocomplete suggestion found. Pressing Enter...');
              await searchInput.press('Enter');
            }
            await page.waitForTimeout(4000);
            searchCompleted = true;
          }
        }
      }
    } catch (directErr) {
      console.warn('[Instamart Scraper] Direct search page navigation failed or timed out:', directErr.message);
    }

    // B. If direct navigation didn't complete the search (e.g., redirected or timed out), run the full home-page interactive flow!
    if (!searchCompleted) {
      console.log('[Instamart Scraper] Fallback: Executing full interactive search starting from Instamart Home Page...');
      try {
        const homeUrl = 'https://www.swiggy.com/instamart';
        if (!page.url().includes('/instamart') || page.url().includes('/search')) {
          await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(3000);
        }

        // Click search container button
        const searchBtnSelector = 'button[data-testid="search-container"], .search-container, a[href*="search"]';
        const searchBtn = page.locator(searchBtnSelector).first();
        if (await searchBtn.isVisible({ timeout: 6000 })) {
          console.log('[Instamart Scraper] Clicking search container button...');
          await searchBtn.click();
          await page.waitForTimeout(2000);
        }

        // Wait for search input
        const searchInputSelector = 'input[data-testid="search-page-header-search-bar-input"], input[data-testid="search-input"], input[class*="SearchInput"], input[name="query"], input[placeholder*="Search for"], input[placeholder*="item"], input[type="search"]';
        const searchInput = page.locator(searchInputSelector).first();
        await searchInput.waitFor({ state: 'visible', timeout: 8000 });

        console.log(`[Instamart Scraper] Typing query "${query}" into search input using sequential keypresses...`);
        await searchInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        try {
          await searchInput.pressSequentially(query, { delay: 120 });
        } catch (err) {
          console.warn('[Instamart Scraper] pressSequentially failed, using fill fallback:', err.message);
          await searchInput.fill(query);
        }
        await page.waitForTimeout(1500); // wait for autocomplete

        // Click matching suggestion or press Enter
        const clickedSuggestion = await page.evaluate((q) => {
          let els = Array.from(document.querySelectorAll('[role="option"], .suggestion-item, .autocomplete-item, [class*="suggestion" i], [class*="Suggestion" i]'));
          if (els.length === 0) {
            els = Array.from(document.querySelectorAll('div, span, p, li, button, a'));
          }
          const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          const suggestion = els.find(el => {
            const tagName = el.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'SVG', 'PATH'].includes(tagName)) return false;

            const text = (el.innerText || '').trim();
            if (!text || text.length > 100 || el.children.length > 0) return false;

            const lowerText = text.toLowerCase();
            if (
              lowerText === 'add' ||
              lowerText === 'search' ||
              lowerText === 'clear' ||
              lowerText.includes('recent') ||
              lowerText.includes('window.___') ||
              lowerText.includes('initial_state') ||
              lowerText.includes('function') ||
              lowerText.includes('{') ||
              lowerText.includes('}') ||
              lowerText.includes('const ')
            ) {
              return false;
            }

            if (keywords.length === 0) {
              return lowerText.includes(q.toLowerCase());
            }
            return keywords.some(kw => lowerText.includes(kw));
          });
          if (suggestion) {
            suggestion.click();
            return { success: true, text: suggestion.innerText };
          }
          return { success: false };
        }, query);

        if (clickedSuggestion.success) {
          console.log(`[Instamart Scraper] Clicked autocomplete suggestion: "${clickedSuggestion.text}"`);
        } else {
          console.log('[Instamart Scraper] No matching suggestion. Pressing Enter...');
          await searchInput.press('Enter');
        }
        await page.waitForTimeout(5000);
      } catch (interactiveErr) {
        console.log('[Instamart Scraper] Fallback interactive search failed:', interactiveErr.message);
        // Last-resort fallback: attempt to navigate to search URL one more time
        const fallbackUrl = `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`;
        console.log(`[Instamart Scraper] Last-resort fallback direct navigation to: ${fallbackUrl}`);
        await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(4000);
      }
    }

    // Wait for some container showing items
    try {
      await page.waitForSelector('img, [class*="item"], [class*="Product"], [data-testid]', { timeout: 8000 });
    } catch (e) {
      console.log('[Instamart Scraper] No content loaded within timeout.');
    }

    // Check if WAF or "Something went wrong" block page is displayed
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isWaf = bodyText.includes('Something went wrong') || bodyText.toLowerCase().includes('access denied') || bodyText.toLowerCase().includes('awswaf');
    if (isWaf) {
      throw new Error('Swiggy Instamart blocked our request (WAF/Something went wrong block page).');
    }

    const sentIds = new Set();
    const pendingProducts = new Map();

    const extractAndEmit = async (isFinal = false) => {
      const currentProducts = await page.evaluate(() => {
        let cards = [];
        
        // Try known selectors
        const selectors = [
          '[data-testid="item-card"]',
          '[data-testid="product-card"]',
          '[class*="itemCard"]',
          '[class*="ItemCard"]',
          '[class*="productCard"]',
          '[class*="ProductCard"]',
          '[class*="style_itemContainer"]',
          '[class*="style_item_container"]',
          '[class*="itemContainer"]',
          '[class*="item-container"]',
          'a[href*="/item/"]',
          'div[class*="_2z9r"]',
          'div[class*="_3tS"]',
          'div[class*="novb"]'
        ];
        
        for (const sel of selectors) {
          const found = Array.from(document.querySelectorAll(sel));
          if (found.length > 0) {
            cards = found;
            break;
          }
        }
        
        // Semantic fallback scanner
        if (cards.length === 0) {
          const divs = Array.from(document.querySelectorAll('div'));
          cards = divs.filter(div => {
            const text = div.innerText || '';
            if (!text.includes('₹')) return false;
            
            const hasImg = div.querySelector('img') !== null;
            if (!hasImg) return false;
            
            const childCards = div.querySelectorAll('div');
            let isLeafCard = true;
            for (const child of childCards) {
              if (child !== div && child.innerText && child.innerText.includes('₹') && child.querySelector('img')) {
                isLeafCard = false;
                break;
              }
            }
            return isLeafCard;
          });
        }

        return cards.map(card => {
          // 1. Image
          const imgEl = card.querySelector('img');
          let image = '';
          if (imgEl) {
            image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
            if (image.startsWith('data:') && imgEl.getAttribute('srcset')) {
              const firstSrc = imgEl.getAttribute('srcset').split(',')[0].trim().split(' ')[0];
              if (firstSrc) image = firstSrc;
            }
          }

          // 2. Title
          let title = '';
          const titleEl = card.querySelector('[class*="title" i]') || card.querySelector('[class*="name" i]') || card.querySelector('h3') || card.querySelector('h4') || card.querySelector('h5');
          if (titleEl) {
            title = titleEl.innerText.trim();
          } else {
            const textNodes = Array.from(card.querySelectorAll('span, div, p'))
              .map(el => el.innerText.trim())
              .filter(t => t.length > 2 && !t.includes('₹') && !/^\d+\s*(g|kg|ml|l|pc|pcs|unit|pack|packet)/i.test(t) && !t.includes('ADD') && !t.includes('OFF'));
            title = textNodes[0] || '';
          }

          // 3. Weight/Pack Size
          let weight = '';
          const weightEl = card.querySelector('[class*="weight" i]') || card.querySelector('[class*="quantity" i]') || card.querySelector('[class*="size" i]') || card.querySelector('[class*="pack" i]');
          if (weightEl) {
            weight = weightEl.innerText.trim();
          } else {
            const textNodes = Array.from(card.querySelectorAll('span, div, p'));
            const foundWeight = textNodes.find(el => {
              const text = el.innerText.trim();
              return el.children.length === 0 && /^\d+\s*(g|kg|ml|l|pc|pcs|unit|units|pack|packet|capsules|tabs|slices)/i.test(text);
            });
            weight = foundWeight ? foundWeight.innerText.trim() : '';
          }

          // 4. Prices
          let price = '';
          let originalPrice = '';
          
          const priceElements = Array.from(card.querySelectorAll('span, div, p')).filter(el => {
            const text = el.innerText.trim();
            return el.children.length === 0 && text.includes('₹');
          });

          if (priceElements.length > 0) {
            const prices = priceElements.map(el => el.innerText.trim());
            price = prices[0] || '';
            if (prices.length > 1) {
              originalPrice = prices[1];
            } else {
              const strikeEl = card.querySelector('[style*="line-through"]') || card.querySelector('[class*="strike"]') || card.querySelector('[class*="line-through"]');
              if (strikeEl) {
                originalPrice = strikeEl.innerText.trim();
              }
            }
          }

          // 5. Discount
          let discount = '';
          const discountEl = Array.from(card.querySelectorAll('span, div, p')).find(el => {
            const text = el.innerText.trim();
            return el.children.length === 0 && (text.includes('OFF') || text.includes('off') || text.includes('%') || text.includes('Save'));
          });
          if (discountEl) {
            discount = discountEl.innerText.trim();
          }

          // 6. Delivery Time
          let delivery = '';
          const deliveryEl = Array.from(card.querySelectorAll('span, div, p')).find(el => {
            const text = el.innerText.trim();
            return el.children.length === 0 && (/\d+\s*(min|MIN)/i.test(text) || text.toLowerCase().includes('mins') || text.toLowerCase().includes('minutes'));
          });
          if (deliveryEl) {
            delivery = deliveryEl.innerText.trim();
          } else {
            const text = card.innerText || '';
            const match = text.match(/(\d+\s*mins?)/i) || text.match(/(\d+-\d+\s*mins?)/i);
            if (match) {
              delivery = match[1];
            }
          }

          // 7. Unique ID
          let id = '';
          const hrefEl = card.querySelector('a') || (card.tagName === 'A' ? card : null);
          if (hrefEl) {
            const href = hrefEl.getAttribute('href') || '';
            const idMatch = href.match(/item\/([^/?#]+)/) || href.match(/product\/([^/?#]+)/);
            if (idMatch) id = idMatch[1];
          }
          if (!id) {
            id = 'im-' + btoa(encodeURIComponent(title + '-' + weight)).replace(/[^a-zA-Z0-9]/g, '').substr(0, 15);
          }

          return {
            id,
            title,
            weight,
            price,
            originalPrice,
            discount,
            image,
            delivery,
            provider: 'instamart'
          };
        }).filter(p => p.title !== '' && p.price !== '');
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

    // Extract initial set
    await extractAndEmit();

    // Scroll down incrementally to load more products and trigger image loading
    let scrollAttempts = 0;
    const maxScrollAttempts = 40;
    while (scrollAttempts < maxScrollAttempts) {
      if (isCancelled()) {
        console.log('[Instamart Scraper] Scraping cancelled: Client disconnected.');
        break;
      }

      await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));
      await new Promise(resolve => setTimeout(resolve, 350));
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

    // Verify that we actually extracted some products
    if (sentIds.size === 0 && !isCancelled()) {
      throw new Error('Scraping completed but 0 products were extracted. This might be due to a blocked proxy.');
    }
  } catch (error) {
    console.log(`[Instamart Scraper] Error during Instamart scraping for location "${locationId}":`, error.message);
    cachedProxy = null;
    instamartStorageStates.delete(locationId);
    throw error;
  } finally {
    await context.close();
  }
}

async function scrapeInstamart(query, locationInfo, onProducts, isCancelled) {
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      if (isCancelled()) break;
      await scrapeInstamartInternal(query, locationInfo, onProducts, isCancelled);
      return; // If it succeeds or completes gracefully, exit loop
    } catch (err) {
      console.log(`[Instamart Scraper] Attempt ${attempt + 1} failed: ${err.message}`);
      cachedProxy = null;
      proxyDiscoveryPromise = null;
      instamartStorageStates.delete(locationInfo.id || 'meerut');
      
      attempt++;
      if (attempt >= maxAttempts || isCancelled()) {
        console.error(`[Instamart Scraper] All attempts failed for query: ${query}`);
        break;
      }
      console.log(`[Instamart Scraper] Retrying... (${attempt}/${maxAttempts})`);
    }
  }
}

module.exports = {
  scrapeInstamart
};
